"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  CircularProgress,
  Tooltip,
  Chip,
  Switch,
} from "@mui/material"
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Campaign as PromotionIcon,
  LocalOffer as OfferIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material"
import { useCompany } from "../../../backend/context/CompanyContext"
import { usePOS } from "../../../backend/context/POSContext"
import type { Promotion } from "../../../backend/interfaces/POS"
import PromotionForm from "../../components/pos/forms/PromotionForm"
import DataHeader from "../../components/reusable/DataHeader"
import { usePermission } from "../../hooks/usePermission"

const PromotionsManagement: React.FC = () => {
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("pos", "promotions")
  const canRemove = canDelete("pos", "promotions")
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
  const [typeFilter] = useState<string>("all")
  const [statusFilter] = useState<string>("all")
  const [] = useState<{
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

  const sortedPromotions = [...filteredPromotions].sort((a, b) => {
    const dir = sortDirection === 'asc' ? 1 : -1
    switch (sortBy) {
      case 'name':
        return (a.name || '').localeCompare(b.name || '') * dir
      case 'type':
        return (a.type || '').localeCompare(b.type || '') * dir
      case 'isActive':
        return (Number(a.isActive) - Number(b.isActive)) * dir
      case 'startDate': {
        const av = new Date((a as any).startDate || 0).getTime()
        const bv = new Date((b as any).startDate || 0).getTime()
        return (av - bv) * dir
      }
      case 'endDate': {
        const av = new Date((a as any).endDate || 0).getTime()
        const bv = new Date((b as any).endDate || 0).getTime()
        return (av - bv) * dir
      }
      default:
        return (a.name || '').localeCompare(b.name || '') * dir
    }
  })

  // Event handlers

  const handleOpenDialog = (promotion: Promotion | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    if ((mode === "create" || mode === "edit") && !canMutate) return
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
    if (!canRemove) return
    if (!window.confirm("Are you sure you want to delete this promotion?")) return
    try {
      await deletePromotion(id)
      setSuccess("Promotion deleted successfully")
    } catch (err) {
      console.error("Error deleting promotion:", err)
    }
  }

  const handleTogglePromotion = async (id: string) => {
    if (!canMutate) return
    try {
      const promotion = promotions.find(p => p.id === id)
      if (promotion) {
        await updatePromotion(id, { isActive: !promotion.isActive })
      }
    } catch (err) {
      console.error("Error toggling promotion:", err)
    }
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
    if (!promotion.conditions || promotion.conditions.length === 0) {
      return "No conditions"
    }
    
    const condition = promotion.conditions[0]
    if (!condition || !condition.type) {
      return "No conditions"
    }
    
    switch (condition.type) {
      case "buy_quantity":
        return `Buy ${condition.quantity || 0} items`
      case "buy_amount":
        return `Spend £${condition.amount || 0}`
      case "specific_items":
        return `Specific items: ${condition.productIds?.length || 0}`
      case "category_items":
        return `Category items: ${condition.categoryIds?.length || 0}`
      case "time_period":
        return `Time: ${condition.timeStart} - ${condition.timeEnd}`
      default:
        return "Custom conditions"
    }
  }

  // DataHeader sort options
  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'type', label: 'Type' },
    { value: 'isActive', label: 'Status' },
    { value: 'startDate', label: 'Start Date' },
    { value: 'endDate', label: 'End Date' }
  ];

  // DataHeader handlers
  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortBy(field);
    setSortDirection(direction);
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    console.log(`Exporting promotions as ${format}`);
    // Export functionality would be implemented here
    // For now, just log the action
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 400 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 0 }}>
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
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit promotions."
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


      {/* Promotions Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={{ textAlign: 'center !important' }}>Name</TableCell>
              <TableCell align="center" sx={{ textAlign: 'center !important' }}>Type</TableCell>
              <TableCell align="center" sx={{ textAlign: 'center !important' }}>Conditions</TableCell>
              <TableCell align="center" sx={{ textAlign: 'center !important' }}>Discount</TableCell>
              <TableCell align="center" sx={{ textAlign: 'center !important' }}>Usage</TableCell>
              <TableCell align="center" sx={{ textAlign: 'center !important' }}>Valid Period</TableCell>
              <TableCell align="center" sx={{ textAlign: 'center !important' }}>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedPromotions.map((promotion) => (
              <TableRow 
                key={promotion.id} 
                hover
                onClick={() => handleOpenDialog(promotion, 'view')}
                sx={{ cursor: "pointer" }}
              >
                <TableCell align="center">
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
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
                <TableCell align="center">
                  <Chip
                    label={getPromotionTypeLabel(promotion.type)}
                    size="small"
                    color={getPromotionColor(promotion.type) as any}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">{formatPromotionConditions(promotion)}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" fontWeight="medium">
                    {promotion.rewards?.[0]?.type === "discount_percentage" 
                      ? `${promotion.rewards[0].percentage || 0}%`
                      : promotion.rewards?.[0]?.type === "discount_amount"
                      ? `£${promotion.rewards[0].amount || 0}`
                      : "N/A"}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">
                    {promotion.usageCount || 0}
                    {promotion.usageLimit ? ` / ${promotion.usageLimit}` : ""}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">
                    {promotion.startDate && promotion.endDate 
                      ? `${new Date(promotion.startDate).toLocaleDateString("en-GB")} - ${new Date(promotion.endDate).toLocaleDateString("en-GB")}`
                      : "No date range"}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Switch
                    checked={promotion.isActive}
                    onChange={(e) => {
                      e.stopPropagation()
                      handleTogglePromotion(promotion.id)
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
                          handleOpenDialog(promotion, 'edit')
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
                          handleDeletePromotion(promotion.id)
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
            {sortedPromotions.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                    <PromotionIcon sx={{ fontSize: 48, color: "text.secondary" }} />
                    <Typography variant="body1" color="text.secondary">
                      {searchTerm || typeFilter !== "all" || statusFilter !== "all"
                        ? "No promotions match your filter criteria."
                        : "No promotions available."}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm || typeFilter !== "all" || statusFilter !== "all"
                        ? "Try adjusting your filters or search terms."
                        : "Create your first promotion to get started."}
                    </Typography>
                  </Box>
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
        onModeChange={setFormMode}
      />
    </Box>
  )
}

export default PromotionsManagement
