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
  TextField,
  IconButton,
  InputAdornment,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Tooltip,
  Chip,
  Switch,
  Card,
  CardContent,
} from "@mui/material"
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Campaign as PromotionIcon,
  LocalOffer as OfferIcon,
  Schedule as ScheduleIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material"
import { useCompany } from "../../../backend/context/CompanyContext"
import { usePOS } from "../../../backend/context/POSContext"
import { Promotion } from "../../../backend/interfaces/POS"
import PromotionForm from "./forms/PromotionForm"
import DataHeader from "../reusable/DataHeader"
import StatsSection from "../reusable/StatsSection"
import EmptyStateCard from "../reusable/EmptyStateCard"
import { debugWarn, debugLog } from "../../../utils/debugLog"

const PromotionsManagement: React.FC = () => {
  const { state: companyState } = useCompany()
  const { 
    state: posState, 
    refreshPromotions,
    updatePromotion,
    deletePromotion
  } = usePOS()
  
  // State variables
  const [success, setSuccess] = useState<string | null>(null)
  
  // DataHeader state
  const [sortBy, setSortBy] = useState<string>("name")
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>("asc")
  
  const { promotions, loading, error } = posState

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [currentPromotion, setCurrentPromotion] = useState<Promotion | null>(null)
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create')


  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: "ascending" | "descending"
  } | null>(null)

  // Load promotions data
  useEffect(() => {
    if (companyState.companyID && companyState.selectedSiteID) {
      refreshPromotions()
    }
  }, [companyState.companyID, companyState.selectedSiteID, refreshPromotions])

  // Filter and sort functions
  const filteredPromotions = promotions.filter((promotion) => {
    // Search filter
    if (searchTerm && !promotion.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    // Type filter
    if (typeFilter !== "all" && promotion.type !== typeFilter) {
      return false
    }
    // Status filter
    if (statusFilter !== "all") {
      const isActive = statusFilter === "active"
      if (promotion.isActive !== isActive) {
        return false
      }
    }
    return true
  })

  const getSortedPromotions = () => {
    if (!sortConfig) return filteredPromotions
    return [...filteredPromotions].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof Promotion] ?? ""
      const bValue = b[sortConfig.key as keyof Promotion] ?? ""
      if (aValue < bValue) {
        return sortConfig.direction === "ascending" ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === "ascending" ? 1 : -1
      }
      return 0
    })
  }

  // Event handlers
  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending"
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending"
    }
    setSortConfig({ key, direction })
  }

  const handleOpenDialog = (promotion: Promotion | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    setCurrentPromotion(promotion)
    setFormMode(mode)
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setCurrentPromotion(null)
    setFormMode('create')
  }


  const handleDeletePromotion = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this promotion?")) return
    try {
      await deletePromotion(id)
      setSuccess("Promotion deleted successfully")
    } catch (err) {
      debugWarn("Error deleting promotion:", err)
    }
  }

  const handleTogglePromotion = async (id: string) => {
    try {
      const promotion = promotions.find(p => p.id === id)
      if (promotion) {
        // Include id in update payload (required for proper updates)
        const updatePayload: any = { id, isActive: !promotion.isActive }
        // Filter out undefined values
        Object.keys(updatePayload).forEach(key => {
          if (updatePayload[key] === undefined) {
            delete updatePayload[key]
          }
        })
        await updatePromotion(id, updatePayload)
      }
    } catch (err) {
      debugWarn("Error toggling promotion:", err)
    }
  }

  const clearFilters = () => {
    setSearchTerm("")
    setTypeFilter("all")
    setStatusFilter("all")
  }

  const getPromotionIcon = (type: string) => {
    switch (type) {
      case "buy_x_get_y":
        return <OfferIcon />
      case "time_based":
        return <ScheduleIcon />
      case "loyalty":
        return <PromotionIcon />
      default:
        return <PromotionIcon />
    }
  }

  const getPromotionColor = (type: string) => {
    switch (type) {
      case "buy_x_get_y":
        return "primary"
      case "percentage_off":
      case "time_based":
        return "warning"
      case "loyalty":
        return "success"
      case "bundle":
        return "secondary"
      default:
        return "default"
    }
  }

  const getPromotionTypeLabel = (type: string) => {
    switch (type) {
      case "buy_x_get_y":
        return "Buy X Get Y"
      case "percentage_off":
        return "Percentage Off"
      case "time_based":
        return "Time Based"
      case "loyalty":
        return "Loyalty"
      case "bundle":
        return "Bundle"
      default:
        return type?.charAt(0)?.toUpperCase() + type?.slice(1) || "Unknown"
    }
  }

  const formatPromotionConditions = (promotion: Promotion) => {
    if (!promotion.conditions || promotion.conditions.length === 0) return "No conditions"
    
    const condition = promotion.conditions[0] // Get the first condition
    if (!condition) return "No conditions"
    
    switch (promotion.type) {
      case "buy_x_get_y":
        return `Buy ${condition.quantity || 2} Get ${condition.quantity || 1}`
      case "percentage_off":
        return condition.timeStart && condition.timeEnd ? `Valid ${condition.timeStart} - ${condition.timeEnd}` : "All day"
      case "time_based":
        return condition.daysOfWeek?.length ? `Days: ${condition.daysOfWeek.join(", ")}` : "No time slots"
      case "loyalty":
        return `${condition.amount || 0} points required`
      case "bundle":
        return `${condition.productIds?.length || 0} items in bundle`
      default:
        return "No conditions"
    }
  }

  // DataHeader sort options
  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'type', label: 'Type' },
    { value: 'active', label: 'Status' },
    { value: 'startDate', label: 'Start Date' },
    { value: 'endDate', label: 'End Date' }
  ];

  // DataHeader handlers
  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortBy(field);
    setSortDirection(direction);
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    debugLog(`Exporting promotions as ${format}`);
    // Export functionality would be implemented here
  };

  // No loading indicators — UI renders and fills as data arrives (like HR section)

  return (
    <Box sx={{ p: 3 }}>
      <DataHeader
        showDateControls={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search promotions..."
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onExportCSV={() => handleExport('csv')}
        onExportPDF={() => handleExport('pdf')}
        onCreateNew={() => handleOpenDialog(null, 'create')}
        createButtonLabel="Create Promotion"
      />

      {/* Stats Cards */}
      <StatsSection
        stats={[
          {
            value: promotions.length,
            label: "Total Promotions",
            color: "primary"
          },
          {
            value: promotions.filter(promo => promo.isActive).length,
            label: "Active Promotions",
            color: "success"
          },
          {
            value: promotions.filter(promo => promo.type === 'buy_x_get_y').length,
            label: "Buy X Get Y",
            color: "info"
          },
          {
            value: promotions.filter(promo => promo.type === 'percentage_off').length,
            label: "Percentage Off",
            color: "warning"
          }
        ]}
      />

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Filters Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>

          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search promotions..."
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
                <InputLabel>Type</InputLabel>
                <Select value={typeFilter} label="Type" onChange={(e) => setTypeFilter(e.target.value)}>
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="buy_x_get_y">Buy X Get Y</MenuItem>
                  <MenuItem value="percentage_off">Percentage Off</MenuItem>
                  <MenuItem value="time_based">Time Based</MenuItem>
                  <MenuItem value="loyalty">Loyalty</MenuItem>
                  <MenuItem value="bundle">Bundle</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
                {filteredPromotions.length} promotions
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={1}>
            
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog(null, 'create')} size="small">
                Create Promotion
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={1}>
              <Button variant="outlined" onClick={clearFilters} size="small">
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Promotions Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell onClick={() => requestSort("name")} sx={{ cursor: "pointer" }}>
                Name {sortConfig?.key === "name" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
              </TableCell>
              <TableCell onClick={() => requestSort("type")} sx={{ cursor: "pointer" }}>
                Type {sortConfig?.key === "type" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
              </TableCell>
              <TableCell>Conditions</TableCell>
              <TableCell>Discount</TableCell>
              <TableCell>Usage</TableCell>
              <TableCell>Valid Period</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {getSortedPromotions().map((promotion) => (
              <TableRow key={promotion.id} hover>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {getPromotionIcon(promotion.type)}
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {promotion.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {promotion.description}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={getPromotionTypeLabel(promotion.type)}
                    size="small"
                    color={getPromotionColor(promotion.type) as any}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{formatPromotionConditions(promotion)}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {promotion.rewards?.[0]?.type === "discount_percentage" 
                      ? `${promotion.rewards[0].percentage || 0}%`
                      : promotion.rewards?.[0]?.type === "discount_amount"
                      ? `£${promotion.rewards[0].amount || 0}`
                      : "No discount"}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {promotion.usageCount || 0}
                    {promotion.usageLimit ? ` / ${promotion.usageLimit}` : ""}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {promotion.startDate && promotion.endDate
                      ? `${new Date(promotion.startDate).toLocaleDateString("en-GB")} - ${new Date(promotion.endDate).toLocaleDateString("en-GB")}`
                      : "No date range"}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={promotion.isActive}
                    onChange={() => handleTogglePromotion(promotion.id)}
                    size="small"
                    color="primary"
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="View">
                    <IconButton size="small" color="info" onClick={() => handleOpenDialog(promotion, 'view')}>
                      <VisibilityIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton size="small" color="primary" onClick={() => handleOpenDialog(promotion, 'edit')}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={() => handleDeletePromotion(promotion.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {getSortedPromotions().length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <EmptyStateCard
                    icon={PromotionIcon}
                    title={
                      searchTerm || typeFilter !== "all" || statusFilter !== "all"
                        ? "No promotions match your filters"
                        : "No promotions available"
                    }
                    description={
                      searchTerm || typeFilter !== "all" || statusFilter !== "all"
                        ? "Try adjusting your filters or search query"
                        : "Create your first promotion to get started"
                    }
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Promotion Form */}
      <PromotionForm
        open={dialogOpen}
        onClose={handleCloseDialog}
        promotion={currentPromotion}
        mode={formMode}
      />
    </Box>
  )
}

export default PromotionsManagement
