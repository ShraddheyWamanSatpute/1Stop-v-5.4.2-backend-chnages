"use client"
import { useLocation } from "react-router-dom"

import { alpha } from "@mui/material/styles";
import type React from "react"
import { useState, useEffect } from "react"
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Button,
  Alert,
  Chip,
  Switch,
  FormControlLabel,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Tooltip,
  IconButton,
  Typography,
} from "@mui/material"
import { useCompany } from "../../../backend/context/CompanyContext"
import { usePOS } from "../../../backend/context/POSContext"
import PaymentTypeForm from "../../components/pos/forms/PaymentTypeForm"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../components/reusable/CRUDModal"
import DataHeader from "../../components/reusable/DataHeader"
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Payment as PaymentIcon,
  CreditCard as CreditCardIcon,
  AccountBalance as BankIcon,
  Link as LinkIcon,
  Save as SaveIcon,
} from "@mui/icons-material"
import type { PaymentType, PaymentIntegration } from "../../../backend/interfaces/POS"
import { usePermission } from "../../hooks/usePermission"
import { themeConfig } from "../../../theme/AppTheme"

interface PaymentMethod {
  id: string
  name: string
  type: "cash" | "card" | "digital" | "other"
  enabled: boolean
  processingFee: number
  description: string
  createdAt: string
  updatedAt: string
}

const PaymentManagement: React.FC = () => {
  const location = useLocation()
  const { canView, canEdit, canDelete } = usePermission()
  const canSee = canView("pos", "payments")
  const canMutate = canEdit("pos", "payments")
  const canRemove = canDelete("pos", "payments")
  const { 
    state: posState,
    refreshPaymentTypes,
    createPaymentType,
    updatePaymentType,
    deletePaymentType
  } = usePOS()
  
  const { paymentTypes, loading } = posState

  // State variables
  const [paymentIntegrations, setPaymentIntegrations] = useState<PaymentIntegration[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [tabValue, setTabValue] = useState(0)
  
  // DataHeader state
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<string>("name")
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>("asc")

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [integrationDialogOpen, setIntegrationDialogOpen] = useState(false)
  const [, setEditingMethod] = useState<PaymentMethod | null>(null)
  const [currentPaymentType] = useState<PaymentType | null>(null)
  const [currentIntegration, setCurrentIntegration] = useState<PaymentIntegration | null>(null)
  
  // Form states
  const [paymentFormOpen, setPaymentFormOpen] = useState(false)
  const [paymentFormMode, setPaymentFormMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedPaymentForForm, setSelectedPaymentForForm] = useState<any>(null)
  const [integrationFormMode, setIntegrationFormMode] = useState<'create' | 'edit' | 'view'>('create')

  // Form states
  const [paymentForm, setPaymentForm] = useState({
    name: "",
    type: "cash" as "cash" | "card" | "digital" | "voucher" | "other",
    integrationId: "",
    integrationName: "",
    requiresAuth: false,
    processingFee: 0,
  })

  // Update the initial state to ensure all required fields are present
  const [integrationForm, setIntegrationForm] = useState<PaymentIntegration>({
    id: "",
    name: "",
    type: "stripe",
    enabled: true,
    isActive: true,
    settings: {},
    config: {
      apiKey: "",
      secretKey: "",
      merchantId: "",
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const [, setFormData] = useState<Partial<PaymentMethod>>({})

  // Search and filter states
  const [typeFilter, ] = useState<string>("all")
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: "ascending" | "descending"
  } | null>(null)

  // Route/tab guards usually handle view permissions, but keep a safety fallback.
  if (!canSee) return null

  const paymentTypeOptions = [
    { value: "cash", label: "Cash" },
    { value: "card", label: "Card" },
    { value: "digital", label: "Digital Wallet" },
    { value: "other", label: "Other" },
  ]


  // Load payment data
  useEffect(() => {
    refreshPaymentTypes()
    
    // Mock payment integrations for demo
    setPaymentIntegrations([
      {
        id: "stripe-1",
        name: "Stripe Main",
        type: "stripe",
        enabled: true,
        settings: {},
        isActive: true,
        config: { 
          apiKey: "pk_test_***", 
          secretKey: "sk_test_***",
          merchantId: "MERCHANT_***"
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "square-1",
        name: "Square POS",
        type: "square",
        enabled: false,
        settings: {},
        isActive: false,
        config: { 
          apiKey: "sq_test_***",
          secretKey: "sq_secret_***",
          merchantId: "MERCHANT_***"
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ])
  }, [])

  // Fetch data on component mount
  // Filter and sort functions
  const filteredPaymentTypes = paymentTypes.filter((paymentType) => {
    // Search filter
    if (searchTerm && !paymentType.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }

    // Type filter
    if (typeFilter !== "all" && paymentType.type !== typeFilter) {
      return false
    }

    return true
  })

  const getSortedPaymentTypes = () => {
    if (!sortConfig) return filteredPaymentTypes

    return [...filteredPaymentTypes].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof PaymentType] ?? ""
      const bValue = b[sortConfig.key as keyof PaymentType] ?? ""

      if (aValue < bValue) {
        return sortConfig.direction === "ascending" ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === "ascending" ? 1 : -1
      }
      return 0
    })
  }


  // Form handlers
  const handleOpenPaymentForm = (paymentType: any = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    if ((mode === "create" || mode === "edit") && !canMutate) return
    setSelectedPaymentForForm(paymentType)
    setPaymentFormMode(mode)
    setPaymentFormOpen(true)
  }

  const handleClosePaymentForm = () => {
    setPaymentFormOpen(false)
    setSelectedPaymentForForm(null)
    setPaymentFormMode('create')
  }

  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending"
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending"
    }
    setSortConfig({ key, direction })
  }


  const handleOpenIntegrationDialog = (integration: PaymentIntegration | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    if ((mode === "create" || mode === "edit") && !canMutate) return
    if (integration) {
      setCurrentIntegration(integration)
      setIntegrationForm({
        ...integration,
        config: integration.config || {
          apiKey: "",
          secretKey: "",
          merchantId: "",
        },
      })
    } else {
      setCurrentIntegration(null)
      setIntegrationForm({
        id: "",
        name: "",
        type: "stripe",
        enabled: true,
        isActive: true,
        settings: {},
        config: {
          apiKey: "",
          secretKey: "",
          merchantId: "",
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    }
    setIntegrationDialogOpen(true)
    setIntegrationFormMode(mode)
  }

  const handleSavePaymentType = async () => {
    if (!canMutate) return
    try {
      const paymentTypeData = {
        name: paymentForm.name,
        type: paymentForm.type,
        isActive: true,
        integrationId: paymentForm.integrationId,
        integrationName: paymentForm.integrationName,
        requiresAuth: paymentForm.requiresAuth,
        processingFee: paymentForm.processingFee,
      }

      if (currentPaymentType) {
        await updatePaymentType(currentPaymentType.id, paymentTypeData)
        setSuccess("Payment type updated successfully")
      } else {
        await createPaymentType(paymentTypeData)
        setSuccess("Payment type created successfully")
      }

      setDialogOpen(false)
      setError(null)
    } catch (err) {
      console.error("Error saving payment type:", err)
      setError("Failed to save payment type. Please try again.")
    }
  }

  const handleSaveIntegration = () => {
    if (!canMutate) return
    // This would save to database in a real implementation
    const updatedConfig = {
      apiKey: integrationForm.config?.apiKey || "",
      secretKey: integrationForm.config?.secretKey || "",
      merchantId: integrationForm.config?.merchantId || "",
    };

    if (currentIntegration) {
      setPaymentIntegrations((prev) =>
        prev.map((integration) =>
          integration.id === currentIntegration.id ? {
            ...integration,
            name: integrationForm.name,
            type: integrationForm.type,
            enabled: integrationForm.enabled,
            isActive: integrationForm.isActive,
            settings: integrationForm.settings,
            config: updatedConfig
          } : integration,
        ),
      );
      setSuccess("Integration updated successfully");
    } else {
      const newIntegration: PaymentIntegration = {
        id: `${integrationForm.type}-${Date.now()}`,
        name: integrationForm.name,
        type: integrationForm.type,
        enabled: integrationForm.enabled,
        isActive: integrationForm.isActive,
        settings: integrationForm.settings,
        config: updatedConfig,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setPaymentIntegrations((prev) => [...prev, newIntegration]);
      setSuccess("Integration created successfully");
    }
    setIntegrationDialogOpen(false);
    setCurrentIntegration(null);
  };

  const handleDeletePaymentType = async (id: string) => {
    if (!canRemove) return
    if (!window.confirm("Are you sure you want to delete this payment type?")) return

    try {
      await deletePaymentType(id)
      setSuccess("Payment type deleted successfully")
      setError(null)
    } catch (err) {
      console.error("Error deleting payment type:", err)
      setError("Failed to delete payment type. Please try again.")
    }
  }

  const handleDeleteIntegration = (id: string) => {
    if (!canRemove) return
    if (!window.confirm("Are you sure you want to delete this integration?")) return

    setPaymentIntegrations((prev) => prev.filter((integration) => integration.id !== id))
    setSuccess("Integration deleted successfully")
  }

  const handleToggleIntegration = (id: string) => {
    if (!canMutate) return
    setPaymentIntegrations((prev) =>
      prev.map((integration) =>
        integration.id === id ? {
          ...integration,
          isActive: !integration.isActive,
          enabled: !integration.isActive,
          config: integration.config || {
            apiKey: "",
            secretKey: "",
            merchantId: ""
          }
        } : integration,
      ),
    )
  }

  // Update form handlers to ensure type safety
  const handleConfigChange = (field: 'apiKey' | 'secretKey' | 'merchantId', value: string) => {
    setIntegrationForm((prev) => ({
      ...prev,
      config: {
        ...prev.config,
        [field]: value
      }
    }));
  };




  const handleCancel = () => {
    setDialogOpen(false)
    setEditingMethod(null)
    setFormData({})
    setError(null)
  }

  const getPaymentTypeIcon = (type: string) => {
    switch (type) {
      case "cash":
        return <PaymentIcon />
      case "card":
        return <CreditCardIcon />
      default:
        return <BankIcon />
    }
  }

  const getPaymentTypeColor = (type: string) => {
    switch (type) {
      case "cash":
        return "success"
      case "card":
        return "primary"
      default:
        return "default"
    }
  }

  const getIntegrationIcon = (type: string) => {
    switch (type) {
      case "stripe":
        return "💳"
      case "square":
        return "⬜"
      case "paypal":
        return "🅿️"
      case "sumup":
        return "📱"
      case "worldpay":
        return "🌍"
      default:
        return "💳"
    }
  }

  // DataHeader sort options
  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'type', label: 'Type' },
    { value: 'enabled', label: 'Status' },
    { value: 'processingFee', label: 'Processing Fee' }
  ];

  // DataHeader handlers
  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortBy(field);
    setSortDirection(direction);
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    const tabNames = ['Payment Types', 'Integrations'];
    const currentTabName = tabNames[tabValue];
    console.log(`Exporting ${currentTabName} as ${format}`);
    // Export functionality would be implemented here
    // For now, just log the action
  };

  if (!canView) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">You don't have permission to view payment management.</Alert>
      </Box>
    )
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 400 }}>
        <Alert severity="info">Loading payment methods...</Alert>
      </Box>
    )
  }

  return (
    <Box>

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

      <DataHeader
        showDateControls={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search payments..."
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onExportCSV={() => handleExport('csv')}
        onExportPDF={() => handleExport('pdf')}
        onCreateNew={() => tabValue === 0 ? handleOpenPaymentForm(null, 'create') : handleOpenIntegrationDialog()}
        createButtonLabel={tabValue === 0 ? "New Payment Type" : "New Integration"}
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit payments."
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
              Payment Types ({paymentTypes.length})
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
              Integrations ({paymentIntegrations.length})
            </Button>
          </Box>
        }
      />

      {/* Payment Types Tab */}
      {tabValue === 0 && (
        <Box>

            {/* Payment Types Table */}
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell align="center" onClick={() => requestSort("name")} sx={{ cursor: "pointer", textAlign: 'center !important' }}>
                      Name {sortConfig?.key === "name" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                    </TableCell>
                    <TableCell align="center" onClick={() => requestSort("type")} sx={{ cursor: "pointer", textAlign: 'center !important' }}>
                      Type {sortConfig?.key === "type" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                    </TableCell>
                    <TableCell align="center" sx={{ textAlign: 'center !important' }}>Configuration</TableCell>
                    <TableCell align="center" sx={{ textAlign: 'center !important' }}>Status</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getSortedPaymentTypes().map((paymentType) => (
                    <TableRow 
                      key={paymentType.id} 
                      hover
                      onClick={() => handleOpenPaymentForm(paymentType, 'view')}
                      sx={{ cursor: "pointer" }}
                    >
                      <TableCell align="center">
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                          {getPaymentTypeIcon(paymentType.type)}
                          <Typography variant="body2">{paymentType.name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={
                            paymentType.type
                              ? paymentType.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                              : ""
                          }
                          size="small"
                          color={getPaymentTypeColor(paymentType.type) as any}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        {paymentType.type === "card" && paymentType.integrationId ? (
                          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, alignItems: "center" }}>
                            <Chip
                              label={paymentType.integrationId ? "Integrated" : "Manual Entry"}
                              size="small"
                              color={paymentType.integrationId ? "success" : "default"}
                            />
                            {paymentType.integrationId && paymentType.integrationName && (
                              <Typography variant="caption" color="text.secondary">
                                via {paymentType.integrationName}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Standard
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Chip label="Active" size="small" color="success" />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="Edit">
                            <IconButton 
                              size="small" 
                              color="primary" 
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenPaymentForm(paymentType, 'edit')
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
                                handleDeletePaymentType(paymentType.id)
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
                  {getSortedPaymentTypes().length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography variant="body1" color="text.secondary">
                          {searchTerm || typeFilter !== "all"
                            ? "No payment types match your filter criteria."
                            : "No payment types available."}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
            </TableBody>
          </Table>
        </TableContainer>
        </Box>
      )}

      {/* Payment Integrations Tab */}
      {tabValue === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Name</TableCell>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Provider</TableCell>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>API Key</TableCell>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Merchant ID</TableCell>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paymentIntegrations.map((integration) => (
                <TableRow 
                  key={integration.id}
                  hover
                  onClick={() => handleOpenIntegrationDialog(integration, 'view')}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell align="center">
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                      <Typography variant="h6" sx={{ fontSize: "1rem" }}>
                        {getIntegrationIcon(integration.type)}
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {integration.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={
                        integration.type
                          ? integration.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                          : ""
                      }
                      size="small"
                      color={integration.isActive ? "success" : "default"}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" color="text.secondary">
                      {integration.config?.apiKey || "***"}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" color="text.secondary">
                      {integration.config?.merchantId || "***"}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Switch
                      checked={integration.isActive ?? false}
                      onChange={(e) => {
                        e.stopPropagation()
                        handleToggleIntegration(integration.id)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      size="small"
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
                            handleOpenIntegrationDialog(integration, 'edit')
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
                            handleDeleteIntegration(integration.id)
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
              {paymentIntegrations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                      <LinkIcon sx={{ fontSize: 48, color: "text.secondary" }} />
                      <Typography variant="h6" color="text.secondary">
                        No Payment Integrations
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Connect with payment processors to handle card transactions seamlessly.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Enhanced Payment Type Dialog */}
      <Dialog open={dialogOpen} onClose={handleCancel} maxWidth="sm" fullWidth>
        <DialogTitle>{currentPaymentType ? "Edit Payment Type" : "Add New Payment Type"}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Payment Type Name"
                value={paymentForm.name || ""}
                onChange={(e) => setPaymentForm({ ...paymentForm, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={paymentForm.type || ""}
                  label="Type"
                  onChange={(e) => setPaymentForm({ ...paymentForm, type: e.target.value as PaymentType["type"] })}
                >
                  {paymentTypeOptions.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Processing Fee (%)"
                type="number"
                inputProps={{ min: 0, step: 0.1 }}
                value={paymentForm.integrationId || ""}
                onChange={(e) =>
                  setPaymentForm((prev) => ({
                    ...prev,
                    integrationId: e.target.value,
                  }))
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={paymentForm.integrationName || ""}
                onChange={(e) =>
                  setPaymentForm((prev) => ({
                    ...prev,
                    integrationName: e.target.value,
                  }))
                }
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={!!paymentForm.integrationId}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        integrationId: e.target.checked ? "integrated" : "",
                      }))
                    }
                  />
                }
                label="Integrated Processing"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel}>Cancel</Button>
          <Button onClick={handleSavePaymentType} variant="contained" disabled={!canMutate || loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Integration Dialog */}
                        <CRUDModal
              open={integrationDialogOpen}
              onClose={(reason) => {
                setIntegrationDialogOpen(false)
                if (isCrudModalHardDismiss(reason)) {
                  const __workspaceOnClose = () => {
          setIntegrationDialogOpen(false)
          setCurrentIntegration(null)
          setIntegrationFormMode('create')
        }
                  if (typeof __workspaceOnClose === "function") {
                    __workspaceOnClose(reason)
                  }
                }
              }}
              workspaceFormShortcut={{
                crudEntity: "paymentManagementModal1",
                crudMode: integrationFormMode,
              }}
              title={integrationFormMode === 'create' ? 'Add New Integration' : integrationFormMode === 'edit' ? 'Edit Integration' : 'View Integration'}
              mode={integrationFormMode}
              onEdit={() => {
          if (!canMutate) return
          setIntegrationFormMode("edit")
        }}
              onSave={async (...args) => {
                const __workspaceOnSave = async () => {
          handleSaveIntegration()
        }
                if (typeof __workspaceOnSave !== "function") return undefined
                const result = await __workspaceOnSave(...args)
                removeWorkspaceFormDraft(location.pathname, {
                  crudEntity: "paymentManagementModal1",
                  crudMode: integrationFormMode,
                })
                return result
              }}
              disabled={(integrationFormMode === "create" || integrationFormMode === "edit") && !canMutate}
            >
        <Box component="form" sx={{ width: '100%' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Integration Name"
                value={integrationForm.name || ""}
                onChange={(e) => setIntegrationForm((prev) => ({ ...prev, name: e.target.value }))}
                disabled={integrationFormMode === 'view'}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Provider</InputLabel>
                <Select
                  value={integrationForm.type || ""}
                  label="Provider"
                  onChange={(e) => setIntegrationForm((prev) => ({ ...prev, type: e.target.value as any }))}
                  disabled={integrationFormMode === 'view'}
                >
                  {paymentTypeOptions.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography>{getIntegrationIcon(type.value)}</Typography>
                        <Typography>{type.label}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="API Key"
                type="text"
                value={integrationForm.config?.apiKey || ""}
                onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                disabled={integrationFormMode === 'view'}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Secret Key"
                type="password"
                value={integrationForm.config?.secretKey || ""}
                onChange={(e) => handleConfigChange('secretKey', e.target.value)}
                disabled={integrationFormMode === 'view'}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Merchant ID"
                type="text"
                value={integrationForm.config?.merchantId || ""}
                onChange={(e) => handleConfigChange('merchantId', e.target.value)}
                disabled={integrationFormMode === 'view'}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={integrationForm.isActive || false}
                    onChange={(e) => setIntegrationForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                    disabled={integrationFormMode === 'view'}
                  />
                }
                label="Enable this integration"
              />
            </Grid>
          </Grid>
        </Box>
      </CRUDModal>

      {/* Payment Type Form */}
      <PaymentTypeForm
        open={paymentFormOpen}
        onClose={handleClosePaymentForm}
        paymentType={selectedPaymentForForm}
        mode={paymentFormMode}
        onModeChange={(mode) => {
          if ((mode === "create" || mode === "edit") && !canMutate) return
          setPaymentFormMode(mode)
        }}
      />
    </Box>
  )
}

export default PaymentManagement
