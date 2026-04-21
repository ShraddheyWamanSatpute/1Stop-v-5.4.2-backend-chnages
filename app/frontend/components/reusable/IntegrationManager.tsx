/**
 * Reusable Integration Manager Component
 * Supports multiple integration types with a unified UI
 */

"use client"

import React, { useState, useEffect } from "react"
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  IconButton,
} from "@mui/material"
import {
  CheckCircle as CheckCircleIcon,
  Settings as SettingsIcon,
  Link as LinkIcon,
  Close as CloseIcon,
} from "@mui/icons-material"
import { useCompany } from "../../../backend/context/CompanyContext"
import { ref, get, set } from "firebase/database"
import { db } from "../../../backend/services/Firebase"

export interface Integration {
  id: string
  name: string
  description: string
  icon?: string
  enabled: boolean
  connected?: boolean
  connectedAt?: number
  lastSyncAt?: number
  syncStatus?: "idle" | "syncing" | "success" | "error"
  syncError?: string
  config?: Record<string, any>
}

interface IntegrationManagerProps {
  module: "stock" | "hr" | "bookings" | "finance" | "pos" | "company" | "supply"
  availableIntegrations: Integration[]
  onIntegrationChange?: (integrationId: string, enabled: boolean) => void
  layout?: "default" | "compact"
  // Optional overrides so modules can use their own data layer (e.g., StockContext) instead of direct RTDB access here.
  loadIntegrationsOverride?: () => Promise<Record<string, any>>
  saveIntegrationOverride?: (integration: Integration) => Promise<void>
  onIntegrationClick?: (integration: Integration) => void
  hideConfigureButton?: boolean
}

const IntegrationManager: React.FC<IntegrationManagerProps> = ({
  module,
  availableIntegrations,
  onIntegrationChange,
  layout = "default",
  loadIntegrationsOverride,
  saveIntegrationOverride,
  onIntegrationClick,
  hideConfigureButton = false,
}) => {
  const { state: companyState } = useCompany()
  const [integrations, setIntegrations] = useState<Integration[]>(availableIntegrations)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [configValues, setConfigValues] = useState<Record<string, any>>({})

  useEffect(() => {
    loadIntegrations()
  }, [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const getIntegrationsPath = () => {
    if (!companyState.companyID) return null
    let path = `companies/${companyState.companyID}/settings/${module}/integrations`
    if (companyState.selectedSiteID) {
      path += `/sites/${companyState.selectedSiteID}`
      if (companyState.selectedSubsiteID) {
        path += `/subsites/${companyState.selectedSubsiteID}`
      }
    }
    return path
  }

  const loadIntegrations = async () => {
    if (loadIntegrationsOverride) {
      try {
        const savedIntegrations = await loadIntegrationsOverride()
        if (savedIntegrations) {
          setIntegrations((prev) =>
            prev.map((integration) => ({
              ...integration,
              ...(savedIntegrations[integration.id] || {}),
            }))
          )
        }
      } catch (err) {
        console.error("Error loading integrations (override):", err)
      }
      return
    }

    const path = getIntegrationsPath()
    if (!path) return

    try {
      const integrationsRef = ref(db, path)
      const snapshot = await get(integrationsRef)

      if (snapshot.exists()) {
        const savedIntegrations = snapshot.val()
        setIntegrations((prev) =>
          prev.map((integration) => ({
            ...integration,
            ...(savedIntegrations[integration.id] || {}),
          }))
        )
      }
    } catch (err: any) {
      console.error("Error loading integrations:", err)
    }
  }

  const saveIntegration = async (integration: Integration) => {
    if (saveIntegrationOverride) {
      await saveIntegrationOverride(integration)
      setIntegrations((prev) =>
        prev.map((int) => (int.id === integration.id ? integration : int))
      )
      if (onIntegrationChange) {
        onIntegrationChange(integration.id, integration.enabled)
      }
      return
    }

    const path = getIntegrationsPath()
    if (!path) return

    try {
      // Remove undefined values - Firebase doesn't allow undefined
      const cleanIntegration: Record<string, any> = {
        id: integration.id,
        name: integration.name,
        description: integration.description,
        enabled: integration.enabled,
        updatedAt: Date.now(),
      }

      // Only include optional properties if they have defined values
      if (integration.icon !== undefined) cleanIntegration.icon = integration.icon
      if (integration.connected !== undefined) cleanIntegration.connected = integration.connected
      if (integration.connectedAt !== undefined) cleanIntegration.connectedAt = integration.connectedAt
      if (integration.lastSyncAt !== undefined) cleanIntegration.lastSyncAt = integration.lastSyncAt
      if (integration.syncStatus !== undefined) cleanIntegration.syncStatus = integration.syncStatus
      if (integration.syncError !== undefined) cleanIntegration.syncError = integration.syncError
      if (integration.config !== undefined) cleanIntegration.config = integration.config

      const integrationsRef = ref(db, `${path}/${integration.id}`)
      await set(integrationsRef, cleanIntegration)

      setIntegrations((prev) =>
        prev.map((int) => (int.id === integration.id ? integration : int))
      )

      if (onIntegrationChange) {
        onIntegrationChange(integration.id, integration.enabled)
      }
    } catch (err: any) {
      console.error("Error saving integration:", err)
      throw err // Re-throw to show error to user
    }
  }

  const handleToggle = async (integration: Integration) => {
    const updated: Integration = {
      ...integration,
      enabled: !integration.enabled,
    }
    
    // Only set connected to false if disabling, otherwise keep existing value or undefined
    if (updated.enabled) {
      // When enabling, keep existing connected status if it exists
      if (integration.connected !== undefined) {
        updated.connected = integration.connected
      }
    } else {
      // When disabling, set connected to false
      updated.connected = false
    }
    
    await saveIntegration(updated)
  }

  const handleConfigure = (integration: Integration) => {
    setSelectedIntegration(integration)
    setConfigValues(integration.config || {})
    setConfigDialogOpen(true)
  }

  const handleSaveConfig = async () => {
    if (!selectedIntegration) return

    const updated = {
      ...selectedIntegration,
      config: configValues,
    }
    await saveIntegration(updated)
    setConfigDialogOpen(false)
    setSelectedIntegration(null)
  }

  const getStatusChip = (integration: Integration) => {
    if (!integration.enabled) {
      return <Chip label="Disabled" color="default" size="small" />
    }
    if (integration.connected) {
      return <Chip label="Connected" color="success" size="small" icon={<CheckCircleIcon />} />
    }
    return <Chip label="Not Connected" color="warning" size="small" />
  }

  const getSyncStatusChip = (integration: Integration) => {
    if (!integration.syncStatus || integration.syncStatus === "idle") {
      return null
    }
    if (integration.syncStatus === "syncing") {
      return (
        <Chip
          label="Syncing..."
          color="info"
          size="small"
          icon={<CircularProgress size={12} />}
        />
      )
    }
    if (integration.syncStatus === "success") {
      return <Chip label="Synced" color="success" size="small" />
    }
    if (integration.syncStatus === "error") {
      return <Chip label="Sync Error" color="error" size="small" />
    }
    return null
  }

  return (
    <Box>
      {layout !== "compact" && (
        <>
          <Typography variant="h6" gutterBottom>
            Integrations
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Connect your {module} module with third-party services to sync data automatically.
          </Typography>
        </>
      )}

      <Grid container spacing={layout === "compact" ? 2 : 3}>
        {integrations.map((integration) => (
          <Grid item xs={12} md={6} key={integration.id}>
            <Card
              variant={layout === "compact" ? "outlined" : undefined}
              onClick={onIntegrationClick ? () => onIntegrationClick(integration) : undefined}
              sx={
                layout === "compact"
                  ? {
                      borderRadius: 2,
                      height: "100%",
                      cursor: onIntegrationClick ? "pointer" : "default",
                      "& .MuiCardHeader-root": { pb: 0.5 },
                      "& .MuiCardContent-root": { pt: 1 },
                    }
                  : undefined
              }
            >
              <CardHeader
                avatar={
                  integration.icon ? (
                    <Typography variant="h4">{integration.icon}</Typography>
                  ) : (
                    <LinkIcon />
                  )
                }
                title={integration.name}
                action={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {getStatusChip(integration)}
                    {getSyncStatusChip(integration)}
                  </Box>
                }
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {integration.description}
                </Typography>

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                    onClick={(e) => {
                      // Prevent card click opening modal when toggling the switch/button
                      e.stopPropagation()
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Switch
                          checked={integration.enabled}
                          onChange={() => handleToggle(integration)}
                          color="primary"
                        />
                      }
                      label={integration.enabled ? "Enabled" : "Disabled"}
                    />
                    {!hideConfigureButton && (
                      <Button
                        size="small"
                        startIcon={<SettingsIcon />}
                        onClick={() => handleConfigure(integration)}
                        disabled={!integration.enabled}
                      >
                        Configure
                      </Button>
                    )}
                  </Box>
                </Box>

                {integration.enabled && integration.connected && (
                  <Box sx={{ mt: 2 }}>
                    <Divider sx={{ mb: 1 }} />
                    <Typography variant="caption" color="text.secondary">
                      {integration.lastSyncAt
                        ? `Last synced: ${new Date(integration.lastSyncAt).toLocaleString()}`
                        : "Never synced"}
                    </Typography>
                  </Box>
                )}

                {integration.syncError && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {integration.syncError}
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Configuration Dialog */}
      <Dialog
        open={configDialogOpen}
        onClose={() => setConfigDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6">
              Configure {selectedIntegration?.name}
            </Typography>
            <IconButton onClick={() => setConfigDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedIntegration && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {selectedIntegration.description}
              </Typography>

              {/* Integration-specific configuration will be rendered here */}
              {/* For now, we'll show a generic config form */}
              <TextField
                fullWidth
                label="API Key"
                type="password"
                value={configValues.apiKey || ""}
                onChange={(e) =>
                  setConfigValues({ ...configValues, apiKey: e.target.value })
                }
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="API Secret"
                type="password"
                value={configValues.apiSecret || ""}
                onChange={(e) =>
                  setConfigValues({ ...configValues, apiSecret: e.target.value })
                }
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Endpoint URL"
                value={configValues.endpointUrl || ""}
                onChange={(e) =>
                  setConfigValues({ ...configValues, endpointUrl: e.target.value })
                }
              />

              {/* For Lightspeed, we'll use the existing POSIntegrationSettings component */}
              {selectedIntegration.id === "lightspeed" && module === "pos" && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Use the OAuth connection flow in the POS Integration Settings for Lightspeed.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveConfig} variant="contained">
            Save Configuration
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default IntegrationManager

