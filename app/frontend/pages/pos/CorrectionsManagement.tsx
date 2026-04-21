"use client"
import { useLocation } from "react-router-dom"

import { alpha } from "@mui/material/styles";
import type React from "react"
import { useState, useEffect } from "react"
import {
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material"
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
} from "@mui/icons-material"
import { useCompany } from "../../../backend/context/CompanyContext"
import { Correction } from "../../../backend/context/POSContext"
import { usePOS } from "../../../backend/context/POSContext"
import CorrectionForm from "../../components/pos/forms/CorrectionForm"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../components/reusable/CRUDModal"
import DataHeader from "../../components/reusable/DataHeader"
import StatsSection from "../../components/reusable/StatsSection"
import { themeConfig } from "../../../theme/AppTheme"

interface CorrectionRule {
  id: string
  name: string
  type: "void" | "waste" | "edit" | "refund" | "discount"
  description: string
  conditions: {
    requireManagerApproval: boolean
    requireReason: boolean
    allowPartialQuantity: boolean
    maxAmount?: number
    maxPercentage?: number
    applicableProducts: string[] // Product IDs
    applicablePaymentMethods: string[] // Payment method IDs
    timeRestrictions?: {
      enabled: boolean
      startTime: string
      endTime: string
      days: number[] // 0-6 for Sunday-Saturday
    }
  }
  actions: {
    adjustStock: boolean
    createCreditNote: boolean
    refundPayment: boolean
    notifyManager: boolean
    logTransaction: boolean
  }
  isActive: boolean
  createdAt: number
  updatedAt: number
}



const CorrectionsManagement: React.FC = () => {
  const location = useLocation()
  const { state: companyState } = useCompany()
  const { state: posState, refreshCorrections } = usePOS()

  // State variables
  const [corrections, setCorrections] = useState<Correction[]>([])
  const [correctionRules, setCorrectionRules] = useState<CorrectionRule[]>([])
  const [, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load corrections data
  useEffect(() => {
    const loadCorrections = async () => {
      if (!companyState.companyID || !companyState.selectedSiteID) return

      try {
        await refreshCorrections()
        setCorrections(posState.corrections || [])
      } catch (error) {
        console.error("Error loading corrections:", error)
      }
    }

    loadCorrections()
  }, [companyState.companyID, companyState.selectedSiteID, refreshCorrections])

  // Update local state when POS context changes
  useEffect(() => {
    setCorrections(posState.corrections || [])
  }, [posState.corrections])

  // Dialog states
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false)
  const [ruleDialogMode, setRuleDialogMode] = useState<'create' | 'edit' | 'view'>('create')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [currentRule, setCurrentRule] = useState<CorrectionRule | null>(null)
  const [itemToDelete, setItemToDelete] = useState<{ type: "correction" | "rule"; item: any } | null>(null)

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter] = useState<string>("all")
  const [statusFilter] = useState<string>("all")
  const [tabValue, setTabValue] = useState(0)
  
  // DataHeader state
  const [sortBy, setSortBy] = useState<string>("createdAt")
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>("desc")
  
  // Date controls state (for Corrections tab only)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("day")
  const [customDateRange, setCustomDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    end: new Date(), // today
  })
  
  // Form states
  const [correctionFormOpen, setCorrectionFormOpen] = useState(false)
  const [correctionFormMode, setCorrectionFormMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedCorrectionForForm, setSelectedCorrectionForForm] = useState<any>(null)

  const [ruleForm, setRuleForm] = useState<Omit<CorrectionRule, "id" | "createdAt" | "updatedAt">>({
    name: "",
    type: "void",
    description: "",
    conditions: {
      requireManagerApproval: false,
      requireReason: true,
      allowPartialQuantity: true,
      maxAmount: undefined,
      maxPercentage: undefined,
      applicableProducts: [],
      applicablePaymentMethods: [],
      timeRestrictions: {
        enabled: false,
        startTime: "09:00",
        endTime: "22:00",
        days: [1, 2, 3, 4, 5, 6, 0], // All days
      },
    },
    actions: {
      adjustStock: true,
      createCreditNote: false,
      refundPayment: false,
      notifyManager: false,
      logTransaction: true,
    },
    isActive: true,
  })

  // Fetch data on component mount
  useEffect(() => {
    fetchData()
  }, [companyState.companyID, companyState.selectedSiteID])

  const fetchData = async () => {
    if (!companyState.companyID || !companyState.selectedSiteID) return

    setLoading(true)
    setError(null)

    try {
      // const basePath = `${getBasePath('pos')}/data` // Would use when implementing functions
      // Would implement these functions in POSContext
      const [correctionsData, categoriesData] = await Promise.all([
        Promise.resolve([]), // fetchCorrections(basePath),
        Promise.resolve([]), // fetchCategories(basePath),
      ])

      setCorrections(correctionsData)
      setCategories(categoriesData)
      // Load correction rules from localStorage for now (in real app, this would be from database)
      const savedRules = localStorage.getItem(`correctionRules_${companyState.companyID}_${companyState.selectedSiteID}`)
      if (savedRules) {
        setCorrectionRules(JSON.parse(savedRules))
      } else {
        // Create default rules
        const defaultRules: CorrectionRule[] = [
          {
            id: "default-void",
            name: "Void Item",
            type: "void",
            description: "Remove item from bill completely",
            conditions: {
              requireManagerApproval: true,
              requireReason: true,
              allowPartialQuantity: false,
              applicableProducts: [],
              applicablePaymentMethods: [],
            },
            actions: {
              adjustStock: true,
              createCreditNote: false,
              refundPayment: false,
              notifyManager: true,
              logTransaction: true,
            },
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          {
            id: "default-waste",
            name: "Mark as Waste",
            type: "waste",
            description: "Mark item as wasted/damaged",
            conditions: {
              requireManagerApproval: false,
              requireReason: true,
              allowPartialQuantity: true,
              applicableProducts: [],
              applicablePaymentMethods: [],
            },
            actions: {
              adjustStock: true,
              createCreditNote: false,
              refundPayment: false,
              notifyManager: false,
              logTransaction: true,
            },
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ]
        setCorrectionRules(defaultRules)
        localStorage.setItem(
          `correctionRules_${companyState.companyID}_${companyState.selectedSiteID}`,
          JSON.stringify(defaultRules),
        )
      }
    } catch (err) {
      console.error("Error fetching corrections data:", err)
      setError("Failed to load corrections data. Please try again.")
    } finally {
      setLoading(false)
    }
  }


  // Filter functions

  const getFilteredRules = () => {
    return correctionRules.filter((rule) => {
      const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = typeFilter === "all" || rule.type === typeFilter
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? rule.isActive : !rule.isActive)
      return matchesSearch && matchesType && matchesStatus
    })
  }

  // Date period helpers for corrections tab
  const isInSelectedPeriod = (ts?: number) => {
    if (!ts) return false
    const d = new Date(ts)
    if (dateType === 'custom') {
      return d >= customDateRange.start && d <= customDateRange.end
    }
    if (dateType === 'day') {
      const start = new Date(currentDate)
      start.setHours(0,0,0,0)
      const end = new Date(currentDate)
      end.setHours(23,59,59,999)
      return d >= start && d <= end
    }
    if (dateType === 'week') {
      const day = new Date(currentDate)
      const start = new Date(day)
      start.setDate(day.getDate() - day.getDay())
      start.setHours(0,0,0,0)
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      end.setHours(23,59,59,999)
      return d >= start && d <= end
    }
    // month
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    end.setHours(23,59,59,999)
    return d >= start && d <= end
  }

  // Filter + sort corrections
  const filteredCorrectionsSorted = [...corrections]
    .filter(c => (
      (!searchTerm || (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (c.reason || '').toLowerCase().includes(searchTerm.toLowerCase())) &&
      isInSelectedPeriod(c.createdAt)
    ))
    .sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1
      switch (sortBy) {
        case 'createdAt':
          return ((a.createdAt || 0) - (b.createdAt || 0)) * dir
        case 'name':
          return (a.name || '').localeCompare(b.name || '') * dir
        case 'type':
          return (a.type || '').localeCompare(b.type || '') * dir
        case 'status':
          return (a.status || '').localeCompare(b.status || '') * dir
        default:
          return ((a.createdAt || 0) - (b.createdAt || 0)) * dir
      }
    })

  // Sort rules too for consistency
  const filteredRulesSorted = getFilteredRules().sort((a, b) => {
    const dir = sortDirection === 'asc' ? 1 : -1
    if (sortBy === 'name') return a.name.localeCompare(b.name) * dir
    if (sortBy === 'type') return a.type.localeCompare(b.type) * dir
    if (sortBy === 'status') return Number(a.isActive) - Number(b.isActive) * dir
    // default createdAt
    return ((a.createdAt || 0) - (b.createdAt || 0)) * dir
  })

  // CRUD operations for corrections


  const handleDeleteCorrection = async () => {
    if (!itemToDelete || itemToDelete.type !== "correction" || !companyState.companyID || !companyState.selectedSiteID) return

    try {
      // const basePath = `${getBasePath('pos')}/data` // Would use when implementing functions
      // Would implement deleteCorrection in POSContext
      console.log("Delete correction:", itemToDelete.item.id)
      await fetchData()
      setDeleteDialogOpen(false)
      setItemToDelete(null)
    } catch (err) {
      console.error("Error deleting correction:", err)
      setError("Failed to delete correction. Please try again.")
    }
  }

  // CRUD operations for rules
  const handleCreateRule = () => {
    const newRule: CorrectionRule = {
      ...ruleForm,
      id: `rule-${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    const updatedRules = [...correctionRules, newRule]
    setCorrectionRules(updatedRules)
    localStorage.setItem(`correctionRules_${companyState.companyID}_${companyState.selectedSiteID}`, JSON.stringify(updatedRules))
    setRuleDialogOpen(false)
    resetRuleForm()
  }

  const handleUpdateRule = () => {
    if (!currentRule) return

    const updatedRule: CorrectionRule = {
      ...ruleForm,
      id: currentRule.id,
      createdAt: currentRule.createdAt,
      updatedAt: Date.now(),
    }

    const updatedRules = correctionRules.map((rule) => (rule.id === currentRule.id ? updatedRule : rule))
    setCorrectionRules(updatedRules)
    localStorage.setItem(`correctionRules_${companyState.companyID}_${companyState.selectedSiteID}`, JSON.stringify(updatedRules))
    setRuleDialogOpen(false)
    resetRuleForm()
  }

  const handleDeleteRule = () => {
    if (!itemToDelete || itemToDelete.type !== "rule") return

    const updatedRules = correctionRules.filter((rule) => rule.id !== itemToDelete.item.id)
    setCorrectionRules(updatedRules)
    localStorage.setItem(`correctionRules_${companyState.companyID}_${companyState.selectedSiteID}`, JSON.stringify(updatedRules))
    setDeleteDialogOpen(false)
    setItemToDelete(null)
  }

  const handleToggleRuleStatus = (ruleId: string) => {
    const updatedRules = correctionRules.map((rule) =>
      rule.id === ruleId ? { ...rule, isActive: !rule.isActive, updatedAt: Date.now() } : rule,
    )
    setCorrectionRules(updatedRules)
    localStorage.setItem(`correctionRules_${companyState.companyID}_${companyState.selectedSiteID}`, JSON.stringify(updatedRules))
  }

  // Form reset functions

  const resetRuleForm = () => {
    setRuleForm({
      name: "",
      type: "void",
      description: "",
      conditions: {
        requireManagerApproval: false,
        requireReason: true,
        allowPartialQuantity: true,
        maxAmount: undefined,
        maxPercentage: undefined,
        applicableProducts: [],
        applicablePaymentMethods: [],
        timeRestrictions: {
          enabled: false,
          startTime: "09:00",
          endTime: "22:00",
          days: [1, 2, 3, 4, 5, 6, 0],
        },
      },
      actions: {
        adjustStock: true,
        createCreditNote: false,
        refundPayment: false,
        notifyManager: false,
        logTransaction: true,
      },
      isActive: true,
    })
    setCurrentRule(null)
  }

  // Dialog handlers

  const openRuleDialog = (rule?: CorrectionRule, mode: 'create' | 'edit' | 'view' = 'create') => {
    if (rule) {
      setCurrentRule(rule)
      setRuleForm({
        name: rule.name,
        type: rule.type,
        description: rule.description,
        conditions: rule.conditions,
        actions: rule.actions,
        isActive: rule.isActive,
      })
    } else {
      resetRuleForm()
    }
    setRuleDialogMode(mode)
    setRuleDialogOpen(true)
  }

  const openDeleteDialog = (type: "correction" | "rule", item: any) => {
    setItemToDelete({ type, item })
    setDeleteDialogOpen(true)
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "void":
        return "error"
      case "waste":
        return "warning"
      case "edit":
        return "info"
      case "refund":
        return "success"
      case "discount":
        return "secondary"
      default:
        return "default"
    }
  }

  // Form handlers
  const handleOpenCorrectionForm = (correction: any = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    setSelectedCorrectionForForm(correction)
    setCorrectionFormMode(mode)
    setCorrectionFormOpen(true)
  }

  const handleCloseCorrectionForm = () => {
    setCorrectionFormOpen(false)
    setSelectedCorrectionForForm(null)
    setCorrectionFormMode('create')
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
    console.log(`Export corrections as ${format}`)
    // Export functionality would be implemented here
    // For now, just log the action
  }

  const sortOptions = [
    { value: 'createdAt', label: 'Date' },
    { value: 'name', label: 'Name' },
    { value: 'type', label: 'Type' },
    { value: 'status', label: 'Status' }
  ]

  return (
    <Box sx={{ p: 0 }}>
      <DataHeader
        showDateControls={tabValue === 0}
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        dateType={dateType}
        onDateTypeChange={setDateType}
        customStartDate={customDateRange.start}
        customEndDate={customDateRange.end}
        onCustomDateRangeChange={(start, end) => setCustomDateRange({ start, end })}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search corrections and rules..."
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onExportCSV={() => handleExport('csv')}
        onExportPDF={() => handleExport('pdf')}
        onCreateNew={() => tabValue === 0 ? handleOpenCorrectionForm(null, 'create') : openRuleDialog()}
        createButtonLabel={tabValue === 0 ? "Create Correction" : "Create Rule"}
        additionalControls={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Button
              variant={tabValue === 0 ? "contained" : "outlined"}
              size="small"
              onClick={() => setTabValue(0)}
              sx={
                tabValue === 0
                  ? {
                      bgcolor: themeConfig.brandColors.offWhite,
                      color: themeConfig.brandColors.navy,
                      "&:hover": { bgcolor: alpha(themeConfig.brandColors.offWhite, 0.9) },
                      whiteSpace: "nowrap",
                    }
                  : {
                      color: themeConfig.brandColors.offWhite,
                      borderColor: alpha(themeConfig.brandColors.offWhite, 0.5),
                      "&:hover": {
                        borderColor: themeConfig.brandColors.offWhite,
                        bgcolor: alpha(themeConfig.brandColors.offWhite, 0.1),
                      },
                      whiteSpace: "nowrap",
                    }
              }
            >
              Corrections ({corrections.length})
            </Button>
            <Button
              variant={tabValue === 1 ? "contained" : "outlined"}
              size="small"
              onClick={() => setTabValue(1)}
              sx={
                tabValue === 1
                  ? {
                      bgcolor: themeConfig.brandColors.offWhite,
                      color: themeConfig.brandColors.navy,
                      "&:hover": { bgcolor: alpha(themeConfig.brandColors.offWhite, 0.9) },
                      whiteSpace: "nowrap",
                    }
                  : {
                      color: themeConfig.brandColors.offWhite,
                      borderColor: alpha(themeConfig.brandColors.offWhite, 0.5),
                      "&:hover": {
                        borderColor: themeConfig.brandColors.offWhite,
                        bgcolor: alpha(themeConfig.brandColors.offWhite, 0.1),
                      },
                      whiteSpace: "nowrap",
                    }
              }
            >
              Rules ({correctionRules.length})
            </Button>
          </Box>
        }
      />

      {/* Stats Cards */}
      <StatsSection
        stats={[
          {
            value: corrections.length,
            label: "Total Corrections",
            color: "primary"
          },
          {
            value: correctionRules.filter(rule => rule.isActive).length,
            label: "Active Rules",
            color: "success"
          },
          {
            value: correctionRules.filter(rule => rule.type === 'void').length,
            label: "Void Rules",
            color: "info"
          },
          {
            value: correctionRules.filter(rule => rule.type === 'waste').length,
            label: "Waste Rules",
            color: "warning"
          }
        ]}
      />

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}



      {/* Corrections Content */}
      {tabValue === 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>ID</TableCell>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Name</TableCell>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Type</TableCell>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Amount</TableCell>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Reason</TableCell>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Date</TableCell>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCorrectionsSorted.map((correction) => (
                <TableRow 
                  key={correction.id}
                  hover
                  onClick={() => handleOpenCorrectionForm(correction, 'view')}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight="medium">
                      {correction.id}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">{correction.name}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={correction.type} size="small" color={getTypeColor(correction.type) as any} />
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {correction.amount ? `£${correction.amount.toFixed(2)}` : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" color="text.secondary">
                      {correction.reason || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {correction.createdAt ? new Date(correction.createdAt).toLocaleDateString() : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={correction.status || 'Completed'} 
                      size="small" 
                      color={correction.status === 'approved' ? 'success' : correction.status === 'pending' ? 'warning' : 'default'} 
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <IconButton 
                        size="small" 
                        color="primary" 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenCorrectionForm(correction, 'edit')
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="error" 
                        onClick={(e) => {
                          e.stopPropagation()
                          openDeleteDialog("correction", correction)
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {corrections.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No corrections found.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Rules Content */}
      {tabValue === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Name</TableCell>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Type</TableCell>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Description</TableCell>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Requires Approval</TableCell>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Requires Reason</TableCell>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Max Amount</TableCell>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRulesSorted.map((rule) => (
                <TableRow 
                  key={rule.id}
                  hover
                  onClick={() => openRuleDialog(rule, 'view')}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight="medium">
                      {rule.name}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={rule.type} size="small" color={getTypeColor(rule.type) as any} />
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" color="text.secondary">
                      {rule.description}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={rule.conditions.requireManagerApproval ? "Yes" : "No"} 
                      size="small" 
                      color={rule.conditions.requireManagerApproval ? "warning" : "default"} 
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={rule.conditions.requireReason ? "Yes" : "No"} 
                      size="small" 
                      color={rule.conditions.requireReason ? "info" : "default"} 
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {rule.conditions.maxAmount ? `£${rule.conditions.maxAmount}` : 'No limit'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Switch 
                      checked={rule.isActive} 
                      onChange={(e) => {
                        e.stopPropagation()
                        handleToggleRuleStatus(rule.id)
                      }} 
                      onClick={(e) => e.stopPropagation()}
                      size="small" 
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <IconButton 
                        size="small" 
                        color="primary" 
                        onClick={(e) => {
                          e.stopPropagation()
                          openRuleDialog(rule, 'edit')
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="error" 
                        onClick={(e) => {
                          e.stopPropagation()
                          openDeleteDialog("rule", rule)
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {getFilteredRules().length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No correction rules found.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Removed Basic Correction Dialog as only Advanced Rules are needed */}

      {/* Advanced Rule Dialog */}
            <CRUDModal
        open={ruleDialogOpen}
        onClose={(reason) => {
          setRuleDialogOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            const __workspaceOnClose = () => {
          setRuleDialogOpen(false)
          setCurrentRule(null)
          setRuleDialogMode('create')
        }
            if (typeof __workspaceOnClose === "function") {
              __workspaceOnClose(reason)
            }
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "correctionsManagementModal1",
          crudMode: ruleDialogMode,
          id: currentRule?.id,
          itemLabel: currentRule?.name,
        }}
      >
        <Box component="form" sx={{ width: '100%' }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                autoFocus
                margin="dense"
                label="Rule Name"
                fullWidth
                variant="outlined"
                value={ruleForm.name}
                onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                disabled={ruleDialogMode === 'view'}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="dense">
                <InputLabel>Type</InputLabel>
                <Select
                  value={ruleForm.type}
                  label="Type"
                  onChange={(e) => setRuleForm({ ...ruleForm, type: e.target.value as any })}
                  disabled={ruleDialogMode === 'view'}
                >
                  <MenuItem value="void">Void</MenuItem>
                  <MenuItem value="waste">Waste</MenuItem>
                  <MenuItem value="edit">Edit</MenuItem>
                  <MenuItem value="refund">Refund</MenuItem>
                  <MenuItem value="discount">Discount</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                label="Description"
                fullWidth
                multiline
                rows={2}
                variant="outlined"
                value={ruleForm.description}
                onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                disabled={ruleDialogMode === 'view'}
              />
            </Grid>

            {/* Conditions */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Conditions
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={ruleForm.conditions.requireManagerApproval}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        conditions: { ...ruleForm.conditions, requireManagerApproval: e.target.checked },
                      })
                    }
                    disabled={ruleDialogMode === 'view'}
                  />
                }
                label="Require Manager Approval"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={ruleForm.conditions.requireReason}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        conditions: { ...ruleForm.conditions, requireReason: e.target.checked },
                      })
                    }
                    disabled={ruleDialogMode === 'view'}
                  />
                }
                label="Require Reason"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={ruleForm.conditions.allowPartialQuantity}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        conditions: { ...ruleForm.conditions, allowPartialQuantity: e.target.checked },
                      })
                    }
                    disabled={ruleDialogMode === 'view'}
                  />
                }
                label="Allow Partial Quantity"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label="Max Amount (£)"
                type="number"
                fullWidth
                variant="outlined"
                value={ruleForm.conditions.maxAmount || ""}
                onChange={(e) =>
                  setRuleForm({
                    ...ruleForm,
                    conditions: {
                      ...ruleForm.conditions,
                      maxAmount: e.target.value ? Number(e.target.value) : undefined,
                    },
                  })
                }
                disabled={ruleDialogMode === 'view'}
              />
            </Grid>

            {/* Actions */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Actions
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={ruleForm.actions.adjustStock}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        actions: { ...ruleForm.actions, adjustStock: e.target.checked },
                      })
                    }
                    disabled={ruleDialogMode === 'view'}
                  />
                }
                label="Adjust Stock"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={ruleForm.actions.notifyManager}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        actions: { ...ruleForm.actions, notifyManager: e.target.checked },
                      })
                    }
                    disabled={ruleDialogMode === 'view'}
                  />
                }
                label="Notify Manager"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={ruleForm.actions.logTransaction}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        actions: { ...ruleForm.actions, logTransaction: e.target.checked },
                      })
                    }
                    disabled={ruleDialogMode === 'view'}
                  />
                }
                label="Log Transaction"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={ruleForm.isActive}
                    onChange={(e) => setRuleForm({ ...ruleForm, isActive: e.target.checked })}
                    disabled={ruleDialogMode === 'view'}
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </Box>
      </CRUDModal>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this {itemToDelete?.type}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={itemToDelete?.type === "correction" ? handleDeleteCorrection : handleDeleteRule}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Correction Form */}
      <CorrectionForm
        open={correctionFormOpen}
        onClose={handleCloseCorrectionForm}
        correction={selectedCorrectionForForm}
        mode={correctionFormMode}
        onModeChange={setCorrectionFormMode}
      />
    </Box>
  )
}

export default CorrectionsManagement
