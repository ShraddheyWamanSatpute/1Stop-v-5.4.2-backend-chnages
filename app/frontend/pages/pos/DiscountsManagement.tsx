"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  IconButton,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tooltip,
  Chip,
  Switch,
  FormControlLabel,
} from "@mui/material"
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocalOffer as DiscountIcon,
  Percent as PercentIcon,
  AttachMoney as MoneyIcon,
  Save as SaveIcon,
} from "@mui/icons-material"
import { useCompany } from "../../../backend/context/CompanyContext"
import { usePOS } from "../../../backend/context/POSContext"
import DiscountForm from "../../components/pos/forms/DiscountForm"
import DataHeader from "../../components/reusable/DataHeader"
import StatsSection from "../../components/reusable/StatsSection"
import { usePermission } from "../../hooks/usePermission"

interface Discount {
  id: string
  name: string
  type: "percentage" | "fixed"
  value: number
  minOrderValue?: number
  maxDiscount?: number
  active: boolean
  validFrom: string
  validTo: string
  applicableItems: string[]
  description?: string
}

const DiscountsManagement: React.FC = () => {
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("pos", "discounts")
  const canRemove = canDelete("pos", "discounts")
  const { state: companyState } = useCompany()
  const { state: posState, refreshDiscounts } = usePOS()
  
  // State variables
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [loading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // DataHeader state
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<string>("name")
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>("asc")

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [currentDiscount] = useState<Discount | null>(null)
  
  // Form states
  const [discountFormOpen, setDiscountFormOpen] = useState(false)
  const [discountFormMode, setDiscountFormMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedDiscountForForm, setSelectedDiscountForForm] = useState<any>(null)

  // Load discounts data
  useEffect(() => {
    const loadDiscounts = async () => {
      if (!companyState.companyID || !companyState.selectedSiteID) return

      try {
        await refreshDiscounts()
        // Discounts are already in posState.discounts
      } catch (error) {
        console.error("Error loading discounts:", error)
      }
    }

    loadDiscounts()
  }, [companyState.companyID, companyState.selectedSiteID, refreshDiscounts])

  // Use discounts directly from context

  // Form states
  const [discountForm, setDiscountForm] = useState({
    name: "",
    type: "percentage" as "percentage" | "fixed",
    value: 0,
    minOrderValue: 0,
    maxDiscount: 0,
    active: true,
    validFrom: "",
    validTo: "",
    applicableItems: [] as string[],
    description: "",
  })

  // Search and filter states
  const [typeFilter] = useState<string>("all")
  const [statusFilter] = useState<string>("all")
  const [] = useState<{
    key: string
    direction: "ascending" | "descending"
  } | null>(null)

  // Source list from context if available; fallback to local state
  const sourceDiscounts = (posState.discounts as any[]) || discounts

  // Filter and sort functions (DataHeader-driven)
  const filteredDiscounts = sourceDiscounts.filter((discount: any) => {
    // Search filter
    if (searchTerm && !discount.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    // Type filter
    if (typeFilter !== "all" && discount.type !== typeFilter) {
      return false
    }
    // Status filter
    if (statusFilter !== "all") {
      const isActive = statusFilter === "active"
      if (discount.active !== isActive) {
        return false
      }
    }
    return true
  })

  const sortedDiscounts = [...filteredDiscounts].sort((a: any, b: any) => {
    const dir = sortDirection === 'asc' ? 1 : -1
    switch (sortBy) {
      case 'name':
        return (a.name || '').localeCompare(b.name || '') * dir
      case 'type':
        return (a.type || '').localeCompare(b.type || '') * dir
      case 'value':
        return ((a.value || 0) - (b.value || 0)) * dir
      case 'active':
        return (Number(a.active) - Number(b.active)) * dir
      case 'validFrom': {
        const av = new Date(a.validFrom || 0).getTime()
        const bv = new Date(b.validFrom || 0).getTime()
        return (av - bv) * dir
      }
      case 'validTo': {
        const av = new Date(a.validTo || 0).getTime()
        const bv = new Date(b.validTo || 0).getTime()
        return (av - bv) * dir
      }
      default:
        return (a.name || '').localeCompare(b.name || '') * dir
    }
  })

  // Event handlers


  const handleSaveDiscount = () => {
    if (!canMutate) return
    try {
      const discountData: Discount = {
        id: currentDiscount?.id || `disc-${Date.now()}`,
        name: discountForm.name,
        type: discountForm.type,
        value: discountForm.value,
        minOrderValue: discountForm.minOrderValue,
        maxDiscount: discountForm.maxDiscount,
        active: discountForm.active,
        validFrom: discountForm.validFrom,
        validTo: discountForm.validTo,
        applicableItems: discountForm.applicableItems,
        description: discountForm.description,
      }

      if (currentDiscount) {
        setDiscounts((prev) => prev.map((discount) => (discount.id === currentDiscount.id ? discountData : discount)))
        setSuccess("Discount updated successfully")
      } else {
        setDiscounts((prev) => [...prev, discountData])
        setSuccess("Discount created successfully")
      }
      setDialogOpen(false)
    } catch (err) {
      console.error("Error saving discount:", err)
      setError("Failed to save discount. Please try again.")
    }
  }

  const handleDeleteDiscount = (id: string) => {
    if (!canRemove) return
    if (!window.confirm("Are you sure you want to delete this discount?")) return
    setDiscounts((prev) => prev.filter((discount) => discount.id !== id))
    setSuccess("Discount deleted successfully")
  }

  const handleToggleDiscount = (id: string) => {
    if (!canMutate) return
    setDiscounts((prev) =>
      prev.map((discount) => (discount.id === id ? { ...discount, active: !discount.active } : discount)),
    )
  }


  // Form handlers
  const handleOpenDiscountForm = (discount: any = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    if ((mode === "create" || mode === "edit") && !canMutate) return
    setSelectedDiscountForForm(discount)
    setDiscountFormMode(mode)
    setDiscountFormOpen(true)
  }

  const handleCloseDiscountForm = () => {
    setDiscountFormOpen(false)
    setSelectedDiscountForForm(null)
    setDiscountFormMode('create')
  }

  const getDiscountIcon = (type: string) => {
    switch (type) {
      case "percentage":
        return <PercentIcon />
      case "fixed":
        return <MoneyIcon />
      default:
        return <DiscountIcon />
    }
  }

  const getDiscountColor = (type: string) => {
    switch (type) {
      case "percentage":
        return "primary"
      case "fixed":
        return "success"
      default:
        return "default"
    }
  }

  const formatDiscountValue = (discount: Discount) => {
    if (discount.type === "percentage") {
      return `${discount.value}%`
    } else {
      return `£${discount.value.toFixed(2)}`
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 400 }}>
        <CircularProgress />
      </Box>
    )
  }

  // DataHeader handlers
  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortBy(field)
    setSortDirection(direction)
  }

  const handleExport = (format: 'csv' | 'pdf') => {
    console.log(`Export discounts as ${format}`)
    // Export functionality would be implemented here
    // For now, just log the action
  }

  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'type', label: 'Type' },
    { value: 'value', label: 'Value' },
    { value: 'active', label: 'Status' },
    { value: 'validFrom', label: 'Valid From' },
    { value: 'validTo', label: 'Valid To' }
  ]

  return (
    <Box sx={{ p: 0 }}>
      <DataHeader
        showDateControls={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search discounts..."
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onExportCSV={() => handleExport('csv')}
        onExportPDF={() => handleExport('pdf')}
        onCreateNew={() => handleOpenDiscountForm(null, 'create')}
        createButtonLabel="Create Discount"
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit discounts."
      />

      {/* Stats Cards */}
      <StatsSection
        stats={[
          {
            value: posState.discounts?.length || 0,
            label: "Total Discounts",
            color: "primary"
          },
          {
            value: posState.discounts?.filter(discount => discount.isActive).length || 0,
            label: "Active Discounts",
            color: "success"
          },
          {
            value: posState.discounts?.filter(discount => discount.type === 'percentage').length || 0,
            label: "Percentage Discounts",
            color: "info"
          },
          {
            value: discounts.filter(discount => discount.type === 'fixed').length,
            label: "Fixed Amount",
            color: "warning"
          }
        ]}
      />

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}


      {/* Discounts Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={{ textAlign: 'center !important' }}>Name</TableCell>
              <TableCell align="center" sx={{ textAlign: 'center !important' }}>Type</TableCell>
              <TableCell align="center" sx={{ textAlign: 'center !important' }}>Value</TableCell>
              <TableCell align="center" sx={{ textAlign: 'center !important' }}>Min Order</TableCell>
              <TableCell align="center" sx={{ textAlign: 'center !important' }}>Valid Period</TableCell>
              <TableCell align="center" sx={{ textAlign: 'center !important' }}>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedDiscounts.map((discount: any) => (
              <TableRow 
                key={discount.id} 
                hover
                onClick={() => handleOpenDiscountForm(discount, 'view')}
                sx={{ cursor: "pointer" }}
              >
                <TableCell align="center">
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                    {getDiscountIcon(discount.type)}
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {discount.name}
                      </Typography>
                      {discount.description && (
                        <Typography variant="caption" color="text.secondary">
                          {discount.description}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={discount.type === "percentage" ? "Percentage" : "Fixed Amount"}
                    size="small"
                    color={getDiscountColor(discount.type) as any}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" fontWeight="medium">
                    {formatDiscountValue(discount)}
                  </Typography>
                  {discount.maxDiscount && discount.type === "percentage" && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Max: £{discount.maxDiscount}
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">
                    {discount.minOrderValue ? `£${discount.minOrderValue}` : "No minimum"}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">
                    {new Date(discount.validFrom).toLocaleDateString("en-GB")} -{" "}
                    {new Date(discount.validTo).toLocaleDateString("en-GB")}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Switch
                    checked={discount.active}
                    onChange={(e) => {
                      e.stopPropagation()
                      handleToggleDiscount(discount.id)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    size="small"
                    color="primary"
                    disabled={!canMutate}
                  />
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                    <Tooltip title="Edit">
                      <IconButton 
                        size="small" 
                        color="primary" 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenDiscountForm(discount, 'edit')
                        }}
                        disabled={!canMutate}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton 
                        size="small" 
                        color="error" 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteDiscount(discount.id)
                        }}
                        disabled={!canRemove}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {sortedDiscounts.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                    <DiscountIcon sx={{ fontSize: 48, color: "text.secondary" }} />
                    <Typography variant="body1" color="text.secondary">
                      {searchTerm || typeFilter !== "all" || statusFilter !== "all"
                        ? "No discounts match your filter criteria."
                        : "No discounts available."}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm || typeFilter !== "all" || statusFilter !== "all"
                        ? "Try adjusting your filters or search terms."
                        : "Create your first discount to get started."}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Old Dialog - Remove this section since we have CRUDModal at the end */}
      {false && <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{currentDiscount ? "Edit Discount" : "Add New Discount"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                autoFocus
                margin="dense"
                label="Discount Name"
                fullWidth
                variant="outlined"
                value={discountForm.name}
                onChange={(e) => setDiscountForm({ ...discountForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth variant="outlined" margin="dense">
                <InputLabel>Discount Type</InputLabel>
                <Select
                  value={discountForm.type}
                  onChange={(e) =>
                    setDiscountForm({
                      ...discountForm,
                      type: e.target.value as "percentage" | "fixed",
                    })
                  }
                  label="Discount Type"
                >
                  <MenuItem value="percentage">Percentage</MenuItem>
                  <MenuItem value="fixed">Fixed Amount</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label={discountForm.type === "percentage" ? "Percentage (%)" : "Amount (£)"}
                fullWidth
                variant="outlined"
                type="number"
                value={discountForm.value}
                onChange={(e) => setDiscountForm({ ...discountForm, value: Number(e.target.value) })}
                inputProps={{
                  min: 0,
                  max: discountForm.type === "percentage" ? 100 : undefined,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label="Minimum Order Value (£)"
                fullWidth
                variant="outlined"
                type="number"
                value={discountForm.minOrderValue}
                onChange={(e) => setDiscountForm({ ...discountForm, minOrderValue: Number(e.target.value) })}
                inputProps={{ min: 0 }}
              />
            </Grid>
            {discountForm.type === "percentage" && (
              <Grid item xs={12} sm={6}>
                <TextField
                  margin="dense"
                  label="Maximum Discount (£)"
                  fullWidth
                  variant="outlined"
                  type="number"
                  value={discountForm.maxDiscount}
                  onChange={(e) => setDiscountForm({ ...discountForm, maxDiscount: Number(e.target.value) })}
                  inputProps={{ min: 0 }}
                  helperText="Optional: Set a maximum discount amount"
                />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label="Valid From"
                fullWidth
                variant="outlined"
                type="date"
                value={discountForm.validFrom}
                onChange={(e) => setDiscountForm({ ...discountForm, validFrom: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label="Valid To"
                fullWidth
                variant="outlined"
                type="date"
                value={discountForm.validTo}
                onChange={(e) => setDiscountForm({ ...discountForm, validTo: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                label="Description"
                fullWidth
                variant="outlined"
                multiline
                rows={2}
                value={discountForm.description}
                onChange={(e) => setDiscountForm({ ...discountForm, description: e.target.value })}
                helperText="Optional: Add a description for this discount"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={discountForm.active}
                    onChange={(e) => setDiscountForm({ ...discountForm, active: e.target.checked })}
                    color="primary"
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveDiscount} variant="contained" color="primary">
            {currentDiscount ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>}

      {/* Discount Form (CRUDModal is inside DiscountForm) */}
      <DiscountForm
        open={discountFormOpen}
        onClose={handleCloseDiscountForm}
        discount={selectedDiscountForForm}
        mode={discountFormMode}
        onModeChange={setDiscountFormMode}
      />
    </Box>
  )
}

export default DiscountsManagement
