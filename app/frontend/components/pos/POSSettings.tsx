"use client"
import { useLocation } from "react-router-dom"

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Box,
  Tabs,
  Tab,
  Paper,
  Button,
  Switch,
  FormControlLabel,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Snackbar,
  Typography,
  TextField,
} from "@mui/material"
import {
  Settings as SettingsIcon,
  IntegrationInstructions as IntegrationIcon,
  Save as SaveIcon,
  Settings as ConfigureIcon,
} from "@mui/icons-material"

import { usePOS } from "../../../backend/context/POSContext"
import IntegrationManager, { type Integration } from "../reusable/IntegrationManager"
import FormSection from "../reusable/FormSection"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`pos-settings-tabpanel-${index}`}
      aria-labelledby={`pos-settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

function a11yProps(index: number) {
  return {
    id: `pos-settings-tab-${index}`,
    "aria-controls": `pos-settings-tabpanel-${index}`,
  }
}

interface POSSettingsState {
  // General
  defaultCurrency: string
  taxInclusive: boolean
  defaultTaxRate: number
  receiptFooter: string
  printReceiptAutomatically: boolean
}

const POSSettings: React.FC = () => {
  const location = useLocation()
  const { loadPOSSettings, savePOSSettings, loadPOSIntegrations, savePOSIntegration } = usePOS()

  const [activeTab, setActiveTab] = useState(0)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [settings, setSettings] = useState<POSSettingsState>({
    defaultCurrency: "GBP",
    taxInclusive: false,
    defaultTaxRate: 20,
    receiptFooter: "Thank you for your business!",
    printReceiptAutomatically: true,
  })

  // Integration modal state
  const [integrationModalOpen, setIntegrationModalOpen] = useState(false)
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [integrationConfig, setIntegrationConfig] = useState<Record<string, any>>({})

  useEffect(() => {
    const load = async () => {
      try {
        const val = (await loadPOSSettings()) || {}
        setSettings((prev) => ({ ...prev, ...val }))
      } catch (err) {
        setError("Failed to load settings")
      }
    }
    load()
  }, [loadPOSSettings])

  const handleChange = (field: keyof POSSettingsState, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }))
  }

  const save = async () => {
    try {
      setSaving(true)
      setError(null)
      await savePOSSettings(settings as any)
      setSuccess("Settings saved successfully")
    } catch {
      setError("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const availableIntegrations: Integration[] = useMemo(
    () => [
      {
        id: "lightspeed",
        name: "Lightspeed Retail",
        description: "Sync products and sales with Lightspeed",
        icon: "🛒",
        enabled: false,
      },
      {
        id: "square",
        name: "Square",
        description: "Connect Square payments and POS data",
        icon: "📱",
        enabled: false,
      },
      {
        id: "stripe-terminal",
        name: "Stripe Terminal",
        description: "Accept in-person payments via Stripe Terminal",
        icon: "💳",
        enabled: false,
      },
    ],
    [],
  )

  const loadIntegrationsOverride = useCallback(async () => {
    return await loadPOSIntegrations()
  }, [loadPOSIntegrations])

  const saveIntegrationOverride = useCallback(
    async (integration: Integration) => {
      await savePOSIntegration(integration as any)
    },
    [savePOSIntegration],
  )

  const openIntegrationModal = (integration: Integration) => {
    setSelectedIntegration(integration)
    setIntegrationConfig(integration.config || {})
    setIntegrationModalOpen(true)
  }

  const saveIntegrationConfig = async () => {
    if (!selectedIntegration) return
    await savePOSIntegration({
      ...selectedIntegration,
      config: integrationConfig,
      updatedAt: Date.now(),
    } as any)
    removeWorkspaceFormDraft(location.pathname, {
      crudEntity: "pOSSettingsModal1",
      crudMode: "edit",
      id: selectedIntegration.id,
      itemLabel: selectedIntegration.name,
    })
    setIntegrationModalOpen(false)
    setSuccess("Integration saved")
  }

  const tabs = [
    { label: "General", icon: <SettingsIcon /> },
    { label: "Integrations", icon: <IntegrationIcon /> },
  ]

  return (
    <Box sx={{ width: "100%", pt: 2 }}>
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={() => setSuccess(null)} severity="success">
          {success}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={() => setError(null)} severity="error">
          {error}
        </Alert>
      </Snackbar>

      <Paper sx={{ width: "100%" }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider", display: "flex", justifyContent: "space-between", alignItems: "center", px: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            aria-label="POS settings tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            {tabs.map((tab, index) => (
              <Tab key={index} label={tab.label} icon={tab.icon} iconPosition="start" {...a11yProps(index)} />
            ))}
          </Tabs>

          <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </Box>

        {/* General Tab */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ px: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              General POS defaults apply across tills for the selected site/subsite.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormSection title="Currency & tax" subtitle="Defaults used for receipts and pricing.">
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Default currency</InputLabel>
                    <Select
                      value={settings.defaultCurrency}
                      onChange={(e) => handleChange("defaultCurrency", e.target.value)}
                      label="Default currency"
                    >
                      <MenuItem value="GBP">GBP (£)</MenuItem>
                      <MenuItem value="EUR">EUR (€)</MenuItem>
                      <MenuItem value="USD">USD ($)</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    fullWidth
                    label="Default tax rate (%)"
                    type="number"
                    value={settings.defaultTaxRate}
                    onChange={(e) => handleChange("defaultTaxRate", Number(e.target.value) || 0)}
                    sx={{ mb: 2 }}
                  />

                  <FormControlLabel
                    control={<Switch checked={settings.taxInclusive} onChange={(e) => handleChange("taxInclusive", e.target.checked)} />}
                    label="Prices include tax"
                    sx={{ display: "block" }}
                  />
                </FormSection>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormSection title="Receipts" subtitle="Receipt printing and footer message.">
                  <FormControlLabel
                    control={<Switch checked={settings.printReceiptAutomatically} onChange={(e) => handleChange("printReceiptAutomatically", e.target.checked)} />}
                    label="Print receipt automatically"
                    sx={{ display: "block", mb: 2 }}
                  />

                  <TextField
                    fullWidth
                    label="Receipt footer"
                    value={settings.receiptFooter}
                    onChange={(e) => handleChange("receiptFooter", e.target.value)}
                    multiline
                    minRows={3}
                  />
                </FormSection>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* Integrations Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ px: 2 }}>
            <FormSection title="Integrations" subtitle="Click an integration to open setup. Changes save automatically.">
              <IntegrationManager
                module="pos"
                layout="compact"
                hideConfigureButton={true}
                loadIntegrationsOverride={loadIntegrationsOverride}
                saveIntegrationOverride={saveIntegrationOverride}
                onIntegrationClick={(integration) => openIntegrationModal(integration)}
                availableIntegrations={availableIntegrations}
              />
            </FormSection>

            <CRUDModal
              open={integrationModalOpen}
              onClose={(reason) => {
                setIntegrationModalOpen(false)
                if (isCrudModalHardDismiss(reason)) {
                  setSelectedIntegration(null)
                }
              }}
              workspaceFormShortcut={{
                crudEntity: "pOSSettingsModal1",
                crudMode: "edit",
                id: selectedIntegration?.id,
                itemLabel: selectedIntegration?.name,
              }}
              title={selectedIntegration?.name || "Integration"}
              subtitle="Configure and save integration settings"
              icon={<ConfigureIcon />}
              mode="edit"
              onSave={saveIntegrationConfig}
              saveButtonText="Save Integration"
            >
              {!selectedIntegration ? (
                <Alert severity="info">Select an integration.</Alert>
              ) : (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      {selectedIntegration.description}
                    </Typography>
                  </Grid>
                  {selectedIntegration.id === "lightspeed" && (
                    <Grid item xs={12}>
                      <Alert severity="info">
                        Lightspeed now uses the dedicated secure OAuth flow. Configure it from the Lightspeed integration screen instead of storing secrets in this generic modal.
                      </Alert>
                    </Grid>
                  )}
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Client ID / API Key"
                      value={integrationConfig.clientId || integrationConfig.apiKey || ""}
                      onChange={(e) => setIntegrationConfig((p) => ({ ...p, clientId: e.target.value, apiKey: e.target.value }))}
                    />
                  </Grid>
                  {selectedIntegration.id !== "lightspeed" && (
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Client Secret / API Secret"
                        type="password"
                        value={integrationConfig.clientSecret || integrationConfig.apiSecret || ""}
                        onChange={(e) => setIntegrationConfig((p) => ({ ...p, clientSecret: e.target.value, apiSecret: e.target.value }))}
                      />
                    </Grid>
                  )}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Redirect URL / Endpoint"
                      value={integrationConfig.redirectUri || integrationConfig.endpointUrl || ""}
                      onChange={(e) => setIntegrationConfig((p) => ({ ...p, redirectUri: e.target.value, endpointUrl: e.target.value }))}
                    />
                  </Grid>
                </Grid>
              )}
            </CRUDModal>
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  )
}

export default POSSettings

