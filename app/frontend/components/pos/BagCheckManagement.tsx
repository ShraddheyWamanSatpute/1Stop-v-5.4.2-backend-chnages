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
  QrCode,
  AssignmentReturn,
  Settings,
  Print,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
} from "@mui/icons-material"
import { QRCodeSVG } from "qrcode.react"
import { useCompany } from "../../../backend/context/CompanyContext"
// Would implement these functions in POSContext
import {
  usePOS
} from "../../../backend/context/POSContext"
import type { BagCheckConfig } from "../../../backend/interfaces/POS"
import BagCheckForm from "./forms/BagCheckForm"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import DataHeader from "../reusable/DataHeader"
import StatsSection from "../reusable/StatsSection"
import { usePermission } from "../../hooks/usePermission"
import EmptyStateCard from "../reusable/EmptyStateCard"
import { debugWarn } from "../../../utils/debugLog"

// Removed TabPanel in favor of button-based tabs in the DataHeader

interface BagCheckFormData {
  customerName: string
  customerPhone: string
  customerInitials: string
  itemType: string
  description: string
  paymentMethod: string
}

const defaultBagCheckConfig = (): BagCheckConfig => ({
  id: "default",
  bagPrice: 5,
  coatPrice: 3,
  otherPrice: 2,
  requirePhone: false,
  requireInitials: true,
  autoGenerateQR: true,
  isActive: true,
  updatedAt: Date.now(),
})

const BagCheckManagement: React.FC = () => {
  const location = useLocation()
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("pos", "bagcheck")
  const canRemove = canDelete("pos", "bagcheck")
  const { 
    state: posState, 
    refreshBagCheckItems,
    createBagCheckItem,
    updateBagCheckItem,
    deleteBagCheckItem,
    loadPOSSettings,
    savePOSSettings,
  } = usePOS()
  const { state: companyState } = useCompany()
  // const { getBasePath } = useCompany() // Would use getBasePath when implementing functions
  const [activeTab, setActiveTab] = useState(0)
  // Date selection (applies to both tabs)
  const [dateType, setDateType] = useState<'day' | 'week' | 'month' | 'custom'>('day')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined)
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined)
  const [config, setConfig] = useState<BagCheckConfig | null>(null)
  
  // DataHeader state
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<string>("createdAt")
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>("desc")

  // Load bag check items data
  useEffect(() => {
    const loadData = async () => {
      if (!companyState.companyID || !companyState.selectedSiteID) return

      try {
        await refreshBagCheckItems()
        await loadConfig()
      } catch (error) {
        debugWarn("Error loading bag check items:", error)
      }
    }

    loadData()
  }, [companyState.companyID, companyState.selectedSiteID, refreshBagCheckItems])

  // Get data from POS context
  const bagCheckItems = posState.bagCheckItems || []
  
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  // Form states
  const [bagCheckFormOpen, setBagCheckFormOpen] = useState(false)
  const [bagCheckFormMode, setBagCheckFormMode] = useState<'create' | 'edit' | 'view' | 'return'>('create')
  const [selectedBagCheckForForm, setSelectedBagCheckForForm] = useState<any>(null)

  // Dialog states
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false)
  const [returnDialogOpen, setReturnDialogOpen] = useState(false)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)

  // Form states
  const [checkInForm, setCheckInForm] = useState<BagCheckFormData>({
    customerName: "",
    customerPhone: "",
    customerInitials: "",
    itemType: "bag",
    description: "",
    paymentMethod: "cash",
  })
  const [selectedQrCode, setSelectedQrCode] = useState<string>("")
  const [returnQrCode, setReturnQrCode] = useState<string>("")

  const loadData = async () => {
    if (!companyState.companyID || !companyState.selectedSiteID) return
    
    try {
      await refreshBagCheckItems()
    } catch (error) {
      debugWarn("Error loading bag check items:", error)
    }
  }


  const loadConfig = async () => {
    if (!companyState.companyID || !companyState.selectedSiteID) return
    
    try {
      const posSettings = await loadPOSSettings()
      const configData = posSettings?.bagCheckConfig as Partial<BagCheckConfig> | undefined
      setConfig({
        ...defaultBagCheckConfig(),
        ...(configData || {}),
      })
    } catch (err) {
      debugWarn("Error loading bag check config:", err)
      setConfig(defaultBagCheckConfig())
    }
  }

  const handleCheckIn = async () => {
    if (!canMutate) return
    if (!companyState.companyID || !companyState.selectedSiteID || !config) return

    try {
      setLoading(true)
      // Filter out undefined values before creating
      const itemData: any = {
        customerName: checkInForm.customerName,
        customerPhone: checkInForm.customerPhone,
        customerInitials: checkInForm.customerInitials,
        itemType: checkInForm.itemType as "bag" | "coat" | "other",
        description: checkInForm.description,
        price: getItemPrice(checkInForm.itemType),
        paymentMethod: checkInForm.paymentMethod,
        paymentStatus: "completed" as const,
        isReturned: false,
        qrCode: `bagcheck-${Date.now()}`,
      }
      // Filter out undefined values
      Object.keys(itemData).forEach(key => {
        if (itemData[key] === undefined) {
          delete itemData[key]
        }
      })
      
      await createBagCheckItem(itemData)
      setSuccess(`${checkInForm.itemType} checked in successfully! Price: £${(getItemPrice(checkInForm.itemType) || 0).toFixed(2)}`)
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "bagCheckManagementModal1",
        crudMode: "create",
      })
      setCheckInDialogOpen(false)
      resetCheckInForm()
    } catch (err) {
      debugWarn("Error checking in item:", err)
      setError("Failed to check in item")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!canMutate) return
    if (!companyState.companyID || !companyState.selectedSiteID || !returnQrCode) return

    try {
      setLoading(true)
      // Find the item by QR code and update it to mark as returned
      const item = bagCheckItems.find(i => i.qrCode === returnQrCode)
      if (item) {
        // Include id in update payload (required for proper updates)
        const updatePayload: any = {
          id: item.id,
          isReturned: true,
          returnedAt: Date.now(),
          returnedBy: "Staff"
        }
        // Filter out undefined values
        Object.keys(updatePayload).forEach(key => {
          if (updatePayload[key] === undefined) {
            delete updatePayload[key]
          }
        })
        await updateBagCheckItem(item.id, updatePayload)
        setSuccess("Item returned successfully")
      } else {
        throw new Error("Item not found")
      }
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "bagCheckManagementModal2",
        crudMode: "edit",
      })
      setReturnDialogOpen(false)
      setReturnQrCode("")
    } catch (err) {
      debugWarn("Error returning item:", err)
      setError("Failed to return item")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateConfig = async (newConfig: Partial<BagCheckConfig>) => {
    if (!canMutate) return
    if (!companyState.companyID || !companyState.selectedSiteID) return

    try {
      const mergedConfig = {
        ...(config || defaultBagCheckConfig()),
        ...newConfig,
        updatedAt: Date.now(),
      }
      const existingSettings = (await loadPOSSettings()) || {}
      await savePOSSettings({
        ...existingSettings,
        bagCheckConfig: mergedConfig,
      })
      setConfig(mergedConfig)
      setSuccess("Configuration updated successfully")
    } catch (err) {
      debugWarn("Error updating config:", err)
      setError("Failed to update configuration")
    }
  }

  const getItemPrice = (itemType: string): number => {
    if (!config) return 0
    switch (itemType) {
      case "bag":
        return config.bagPrice || 0
      case "coat":
        return config.coatPrice || 0
      case "other":
        return config.otherPrice || 0
      default:
        return 0
    }
  }

  const resetCheckInForm = () => {
    setCheckInForm({
      customerName: "",
      customerPhone: "",
      customerInitials: "",
      itemType: "bag",
      description: "",
      paymentMethod: "cash",
    })
  }

  const showQrCode = (qrCode: string) => {
    setSelectedQrCode(qrCode)
    setQrDialogOpen(true)
  }


  // Date period helper
  const isInSelectedPeriod = (timestamp?: number) => {
    if (!timestamp) return false
    const date = new Date(timestamp)
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

  const normalizedSearch = searchTerm.trim().toLowerCase()

  const filteredItems = bagCheckItems.filter(item =>
    (isInSelectedPeriod(item.createdAt)) && (
      (item.customerName || '').toLowerCase().includes(normalizedSearch) ||
      (item.customerPhone || '').includes(searchTerm) ||
      (item.customerInitials || '').toLowerCase().includes(normalizedSearch) ||
      item.itemType.toLowerCase().includes(normalizedSearch)
    )
  )

  const activeItems = filteredItems.filter(item => !item.isReturned)
  const returnedItems = filteredItems.filter(item => item.isReturned)

  // Apply sorting
  const dir = sortDirection === 'asc' ? 1 : -1
  const sortFn = (a: any, b: any) => {
    switch (sortBy) {
      case 'createdAt':
        return ((a.createdAt || 0) - (b.createdAt || 0)) * dir
      case 'customerName':
        return ((a.customerName || '').localeCompare(b.customerName || '')) * dir
      case 'itemType':
        return ((a.itemType || '').localeCompare(b.itemType || '')) * dir
      case 'price':
        return ((a.price || 0) - (b.price || 0)) * dir
      default:
        return ((a.createdAt || 0) - (b.createdAt || 0)) * dir
    }
  }
  const activeItemsSorted = [...activeItems].sort(sortFn)
  const returnedItemsSorted = [...returnedItems].sort(sortFn)

  // DataHeader sort options
  const sortOptions = [
    { value: 'createdAt', label: 'Check-in Date' },
    { value: 'customerName', label: 'Customer Name' },
    { value: 'itemType', label: 'Item Type' },
    { value: 'price', label: 'Price' }
  ];

  // DataHeader handlers
  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortBy(field);
    setSortDirection(direction);
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    const tabNames = ['Active Items', 'Returned Items'];
    const currentTabName = tabNames[activeTab];
    // Export functionality would be implemented here
    // Export functionality would be implemented here
    // For now, just log the action
  };

  return (
    <Box sx={{ p: 0 }}>
      <DataHeader
        showDateControls={true}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search items..."
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onExportCSV={() => handleExport('csv')}
        onExportPDF={() => handleExport('pdf')}
        onCreateNew={() => setCheckInDialogOpen(true)}
        createButtonLabel="Check In Item"
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit bag check items."
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
            label: "Return Item",
            icon: <AssignmentReturn />,
            onClick: () => setReturnDialogOpen(true),
            variant: "outlined",
            color: "secondary",
            disabled: !canMutate,
            tooltip: "You don't have permission to create or edit bag check items.",
          },
          {
            label: "Settings",
            icon: <Settings />,
            onClick: () => setConfigDialogOpen(true),
            variant: "outlined",
            color: "primary",
            disabled: !canMutate,
            tooltip: "You don't have permission to edit bag check settings.",
          },
        ]}
        additionalControls={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'nowrap', minWidth: 0 }}>
            <Button
              variant={activeTab === 0 ? "contained" : "outlined"}
              size="small"
              onClick={() => setActiveTab(0)}
              sx={
                activeTab === 0
                  ? { bgcolor: 'white', color: themeConfig.brandColors.navy, '&:hover': { bgcolor: alpha(themeConfig.brandColors.navy, 0.04) }, whiteSpace: 'nowrap' }
                  : { color: 'white', borderColor: alpha(themeConfig.brandColors.offWhite, 0.5), '&:hover': { borderColor: 'white', bgcolor: alpha(themeConfig.brandColors.offWhite, 0.1) }, whiteSpace: 'nowrap' }
              }
            >
              Active Items
            </Button>
            <Button
              variant={activeTab === 1 ? "contained" : "outlined"}
              size="small"
              onClick={() => setActiveTab(1)}
              sx={
                activeTab === 1
                  ? { bgcolor: 'white', color: themeConfig.brandColors.navy, '&:hover': { bgcolor: alpha(themeConfig.brandColors.navy, 0.04) }, whiteSpace: 'nowrap' }
                  : { color: 'white', borderColor: alpha(themeConfig.brandColors.offWhite, 0.5), '&:hover': { borderColor: 'white', bgcolor: alpha(themeConfig.brandColors.offWhite, 0.1) }, whiteSpace: 'nowrap' }
              }
            >
              Returned Items
            </Button>
          </Box>
        }
      />


      {/* Stats Cards */}
      <StatsSection
        stats={[
          {
            value: filteredItems.length,
            label: "Total Items",
            color: "primary"
          },
          {
            value: returnedItems.length,
            label: "Returned Items",
            color: "success"
          },
          {
            value: activeItems.length,
            label: "Pending Returns",
            color: "warning"
          },
          {
            value: filteredItems.reduce((sum, item) => sum + (item.price || 0), 0).toFixed(2),
            label: "Total Revenue",
            color: "info",
            prefix: "£"
          }
        ]}
      />


      {/* Active Items Tab */}
      {activeTab === 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Customer</TableCell>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Phone</TableCell>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Initials</TableCell>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Item Type</TableCell>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Description</TableCell>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Price</TableCell>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Check-in Time</TableCell>
                <TableCell align="center">QR Code</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activeItemsSorted.map((item) => (
                <TableRow 
                  key={item.id}
                  hover
                  sx={{ cursor: "default" }}
                >
                  <TableCell align="center">{item.customerName || item.customerInitials || 'N/A'}</TableCell>
                  <TableCell align="center">{item.customerPhone || 'N/A'}</TableCell>
                  <TableCell align="center">{item.customerName || item.customerInitials || 'N/A'}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={item.itemType}
                      color={item.itemType === "bag" ? "primary" : item.itemType === "coat" ? "secondary" : "default"}
                    />
                  </TableCell>
                  <TableCell align="center">{item.description}</TableCell>
                  <TableCell align="center">£{item.price.toFixed(2)}</TableCell>
                  <TableCell align="center">
                    {new Date(item.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton onClick={() => showQrCode(item.qrCode)}>
                      <QrCode />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Returned Items Tab */}
      {activeTab === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Customer</TableCell>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Phone</TableCell>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Item Type</TableCell>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Price</TableCell>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Check-in Time</TableCell>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Return Time</TableCell>
                <TableCell align="center">Returned By</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {returnedItemsSorted.map((item) => (
                <TableRow 
                  key={item.id}
                  hover
                  sx={{ cursor: "default" }}
                >
                  <TableCell align="center">{item.customerInitials || 'N/A'}</TableCell>
                  <TableCell align="center">{item.customerPhone}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={item.itemType}
                      color="default"
                    />
                  </TableCell>
                  <TableCell align="center">£{item.price.toFixed(2)}</TableCell>
                  <TableCell align="center">
                    {new Date(item.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell align="center">
                    {item.returnedAt ? new Date(item.returnedAt).toLocaleString() : "-"}
                  </TableCell>
                  <TableCell align="center">{item.returnedBy || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Check In Modal */}
      <CRUDModal
        open={checkInDialogOpen}
        onClose={(reason) => {
          setCheckInDialogOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            resetCheckInForm()
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "bagCheckManagementModal1",
          crudMode: "create",
        }}
        title="Check In Item"
        icon={<QrCode />}
        mode="create"
        onSave={handleCheckIn}
        loading={loading}
        disabled={loading ||
          !checkInForm.customerName ||
          (config?.requirePhone && !checkInForm.customerPhone) ||
          (config?.requireInitials && !checkInForm.customerInitials)}
      >
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Customer Name"
                value={checkInForm.customerName}
                onChange={(e) => setCheckInForm({ ...checkInForm, customerName: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={8}>
              <TextField
                fullWidth
                label="Phone Number"
                value={checkInForm.customerPhone}
                onChange={(e) => setCheckInForm({ ...checkInForm, customerPhone: e.target.value })}
                required={config?.requirePhone}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="Initials"
                value={checkInForm.customerInitials}
                onChange={(e) => setCheckInForm({ ...checkInForm, customerInitials: e.target.value.toUpperCase() })}
                inputProps={{ maxLength: 3 }}
                required={config?.requireInitials}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Item Type</InputLabel>
                <Select
                  value={checkInForm.itemType}
                  onChange={(e) => setCheckInForm({ ...checkInForm, itemType: e.target.value })}
                >
                  <MenuItem value="bag">Bag - £{config?.bagPrice?.toFixed(2) || "0.00"}</MenuItem>
                  <MenuItem value="coat">Coat - £{config?.coatPrice?.toFixed(2) || "0.00"}</MenuItem>
                  <MenuItem value="other">Other - £{config?.otherPrice?.toFixed(2) || "0.00"}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={checkInForm.paymentMethod}
                  onChange={(e) => setCheckInForm({ ...checkInForm, paymentMethod: e.target.value })}
                >
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="card">Card</MenuItem>
                  <MenuItem value="contactless">Contactless</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description (Optional)"
                multiline
                rows={2}
                value={checkInForm.description}
                onChange={(e) => setCheckInForm({ ...checkInForm, description: e.target.value })}
                placeholder="Color, brand, special features..."
              />
            </Grid>
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6">
                    Total: £{(getItemPrice(checkInForm.itemType) || 0).toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
      </CRUDModal>

      {/* Return Item Modal */}
      <CRUDModal
        open={returnDialogOpen}
        onClose={(reason) => {
          setReturnDialogOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setReturnQrCode("")
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "bagCheckManagementModal2",
          crudMode: "edit",
        }}
        title="Return Item"
        icon={<AssignmentReturn />}
        mode="edit"
        onSave={handleSubmit}
        loading={loading}
        disabled={loading || !returnQrCode}
      >
          <TextField
            fullWidth
            label="Scan or Enter QR Code"
            value={returnQrCode}
            onChange={(e) => setReturnQrCode(e.target.value)}
            sx={{ mt: 2 }}
            placeholder="BAG_XXXXXXXXX"
          />
      </CRUDModal>

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Bag Check Settings</DialogTitle>
        <DialogContent>
          {config && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Default Prices
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="Bag Price (£)"
                  type="number"
                  inputProps={{ step: "0.01", min: "0" }}
                  defaultValue={config.bagPrice}
                  onBlur={(e) => {
                    const newPrice = parseFloat(e.target.value) || 0
                    handleUpdateConfig({ bagPrice: newPrice })
                  }}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="Coat Price (£)"
                  type="number"
                  inputProps={{ step: "0.01", min: "0" }}
                  defaultValue={config.coatPrice}
                  onBlur={(e) => {
                    const newPrice = parseFloat(e.target.value) || 0
                    handleUpdateConfig({ coatPrice: newPrice })
                  }}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="Other Price (£)"
                  type="number"
                  inputProps={{ step: "0.01", min: "0" }}
                  defaultValue={config.otherPrice}
                  onBlur={(e) => {
                    const newPrice = parseFloat(e.target.value) || 0
                    handleUpdateConfig({ otherPrice: newPrice })
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Customer Information Requirements
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.requirePhone}
                      onChange={(e) => handleUpdateConfig({ requirePhone: e.target.checked })}
                    />
                  }
                  label="Require Phone Number"
                />
              </Grid>
              <Grid item xs={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.requireInitials}
                      onChange={(e) => handleUpdateConfig({ requireInitials: e.target.checked })}
                    />
                  }
                  label="Require Initials"
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

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

      {/* Bag Check Form Modal */}
      <CRUDModal
        open={bagCheckFormOpen}
        onClose={(reason) => {
          setBagCheckFormOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setSelectedBagCheckForForm(null)
            setBagCheckFormMode("create")
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "bagCheckManagementModal3",
          crudMode: bagCheckFormMode === "return" ? "edit" : bagCheckFormMode,
          id: selectedBagCheckForForm?.id,
          itemLabel: selectedBagCheckForForm?.customerName,
        }}
        title="Bag check"
        icon={<QrCode />}
        mode={bagCheckFormMode === "return" ? "edit" : bagCheckFormMode}
        onEdit={() => {
          if (!canMutate) return
          setBagCheckFormMode("edit")
        }}
        disabled={(bagCheckFormMode === "create" || bagCheckFormMode === "edit" || bagCheckFormMode === "return") && !canMutate}
      >
        <BagCheckForm
          bagCheckItem={selectedBagCheckForForm}
          mode={bagCheckFormMode}
          onSave={async (formData: any) => {
            if (bagCheckFormMode === 'create') {
              await createBagCheckItem(formData)
            } else if (bagCheckFormMode === 'edit' && selectedBagCheckForForm) {
              await updateBagCheckItem(selectedBagCheckForForm.id, formData)
            } else if (bagCheckFormMode === 'return' && selectedBagCheckForForm) {
              await updateBagCheckItem(selectedBagCheckForForm.id, {
                ...formData,
                isReturned: true,
                returnedAt: Date.now(),
                returnedBy: 'Staff'
              })
            }
          }}
        />
      </CRUDModal>
    </Box>
  )
}

export default BagCheckManagement
