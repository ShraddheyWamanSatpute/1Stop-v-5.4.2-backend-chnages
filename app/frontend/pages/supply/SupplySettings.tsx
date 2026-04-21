"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  Grid,
  Paper,
  Snackbar,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material"
import {
  Save as SaveIcon,
  Settings as SettingsIcon,
  IntegrationInstructions as IntegrationIcon,
  Gavel as ComplianceIcon,
} from "@mui/icons-material"
import { useSupply } from "../../../backend/context/SupplyContext"
import DataHeader from "../../components/reusable/DataHeader"
import FormSection from "../../components/reusable/FormSection"
import IntegrationManager, { type Integration } from "../../components/reusable/IntegrationManager"

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index, ...other } = props
  return (
    <div role="tabpanel" hidden={value !== index} id={`supply-settings-tabpanel-${index}`} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

const SupplySettings: React.FC = () => {
  const { state: supplyState, loadSupplySettingsSection, saveSupplySettingsSection } = useSupply()
  const [activeTab, setActiveTab] = useState(0)
  const [saving, setSaving] = useState(false)

  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [general, setGeneral] = useState({
    defaultCurrency: "GBP",
    enableDraftOrders: true,
    enableDeliveryTracking: true,
  })

  const [compliance, setCompliance] = useState({
    requireClientEmail: false,
    requireOrderReference: false,
    requireDeliveryProofUrl: false,
  })

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const [generalSettings, complianceSettings] = await Promise.all([
          loadSupplySettingsSection("general"),
          loadSupplySettingsSection("compliance"),
        ])

        if (cancelled) return

        if (generalSettings) {
          setGeneral((prev) => ({ ...prev, ...(generalSettings as any) }))
        }
        if (complianceSettings) {
          setCompliance((prev) => ({ ...prev, ...(complianceSettings as any) }))
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Failed to load settings")
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [loadSupplySettingsSection])

  const tabs = useMemo(
    () => [
      { label: "General", icon: <SettingsIcon />, id: "general" },
      { label: "Integrations", icon: <IntegrationIcon />, id: "integrations" },
      { label: "Compliance", icon: <ComplianceIcon />, id: "compliance" },
    ],
    [],
  )

  const availableIntegrations: Integration[] = useMemo(
    () => [
      {
        id: "xero",
        name: "Xero",
        description: "Sync supplier invoices and payments with Xero",
        icon: "X",
        enabled: false,
      },
      {
        id: "quickbooks",
        name: "QuickBooks",
        description: "Connect QuickBooks for supply-side accounting sync",
        icon: "Q",
        enabled: false,
      },
      {
        id: "shippo",
        name: "Shippo",
        description: "Connect shipping and delivery tracking providers",
        icon: "S",
        enabled: false,
      },
    ],
    [],
  )

  const save = async () => {
    try {
      setSaving(true)
      setError(null)
      await Promise.all([
        saveSupplySettingsSection("general", general as any),
        saveSupplySettingsSection("compliance", compliance as any),
      ])
      setSuccess("Settings saved successfully")
    } catch (e: any) {
      setError(e?.message || "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box sx={{ width: "100%" }}>
      <DataHeader title="" showDateControls={false} />

      <Snackbar open={!!success} autoHideDuration={6000} onClose={() => setSuccess(null)}>
        <Alert onClose={() => setSuccess(null)} severity="success">
          {success}
        </Alert>
      </Snackbar>
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
        <Alert onClose={() => setError(null)} severity="error">
          {error}
        </Alert>
      </Snackbar>

      <Paper sx={{ width: "100%" }}>
        <Box
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            px: 2,
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_e, v) => setActiveTab(v)}
            aria-label="Supply settings tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            {tabs.map((t) => (
              <Tab key={t.id} label={t.label} icon={t.icon} iconPosition="start" />
            ))}
          </Tabs>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </Box>

        <TabPanel value={activeTab} index={0}>
          <Box sx={{ px: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              General Supply defaults apply when creating new supply records.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormSection title="Defaults" subtitle="Currency and basic module behaviors.">
                  <TextField
                    fullWidth
                    label="Default currency"
                    value={general.defaultCurrency}
                    onChange={(e) => setGeneral((p) => ({ ...p, defaultCurrency: e.target.value }))}
                    helperText="Used for display only (reports/widgets)."
                  />
                </FormSection>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormSection title="Features" subtitle="Turn features on/off for the Supply module.">
                  <FormControlLabel
                    control={
                      <Switch
                        checked={general.enableDraftOrders}
                        onChange={(e) => setGeneral((p) => ({ ...p, enableDraftOrders: e.target.checked }))}
                      />
                    }
                    label="Enable draft orders"
                    sx={{ display: "block" }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={general.enableDeliveryTracking}
                        onChange={(e) => setGeneral((p) => ({ ...p, enableDeliveryTracking: e.target.checked }))}
                      />
                    }
                    label="Enable delivery tracking"
                    sx={{ display: "block" }}
                  />
                </FormSection>
              </Grid>

              <Grid item xs={12}>
                <FormSection title="Module info" subtitle="Current Supply context status (read-only).">
                  <Typography variant="body2">Initialized: {supplyState.initialized ? "Yes" : "No"}</Typography>
                  <Typography variant="body2">Loading: {supplyState.loading ? "Yes" : "No"}</Typography>
                  <Typography variant="body2" color={supplyState.error ? "error" : "text.primary"}>
                    Error: {supplyState.error || "None"}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, wordBreak: "break-all" }} color="text.secondary">
                    Path: {supplyState.supplyPath || "(not set yet)"}
                  </Typography>
                </FormSection>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Box sx={{ px: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Connect Supply to accounting, supplier, and delivery services. Integration changes save automatically.
            </Typography>
            <FormSection title="Integrations" subtitle="Configure external services for Supply.">
              <IntegrationManager module="supply" layout="compact" availableIntegrations={availableIntegrations} />
            </FormSection>
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Box sx={{ px: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Compliance defaults help enforce consistent data entry for Supply.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormSection title="Client requirements" subtitle="Defaults applied when creating clients.">
                  <FormControlLabel
                    control={
                      <Switch
                        checked={compliance.requireClientEmail}
                        onChange={(e) => setCompliance((p) => ({ ...p, requireClientEmail: e.target.checked }))}
                      />
                    }
                    label="Require client email"
                    sx={{ display: "block" }}
                  />
                </FormSection>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormSection title="Order requirements" subtitle="Defaults applied when creating orders.">
                  <FormControlLabel
                    control={
                      <Switch
                        checked={compliance.requireOrderReference}
                        onChange={(e) => setCompliance((p) => ({ ...p, requireOrderReference: e.target.checked }))}
                      />
                    }
                    label="Require order reference"
                    sx={{ display: "block" }}
                  />
                </FormSection>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormSection title="Delivery requirements" subtitle="Defaults applied when creating deliveries.">
                  <FormControlLabel
                    control={
                      <Switch
                        checked={compliance.requireDeliveryProofUrl}
                        onChange={(e) => setCompliance((p) => ({ ...p, requireDeliveryProofUrl: e.target.checked }))}
                      />
                    }
                    label="Require proof of delivery URL"
                    sx={{ display: "block" }}
                  />
                </FormSection>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  )
}

export default SupplySettings
