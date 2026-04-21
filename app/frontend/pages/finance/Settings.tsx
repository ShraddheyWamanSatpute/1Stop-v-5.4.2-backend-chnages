"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useLocation } from "react-router-dom"
import {
  Box,
  Tabs,
  Tab,
  Paper,
  Button,
  Grid,
  Snackbar,
  Alert,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material"
import {
  Settings as SettingsIcon,
  Gavel as ControlsIcon,
  IntegrationInstructions as IntegrationIcon,
  Save as SaveIcon,
  Settings as ConfigureIcon,
} from "@mui/icons-material"

import { useFinance } from "../../../backend/context/FinanceContext"
import FormSection from "../../components/reusable/FormSection"
import IntegrationManager, { type Integration } from "../../components/reusable/IntegrationManager"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../components/reusable/CRUDModal"
import { usePermission } from "../../hooks/usePermission"

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div role="tabpanel" hidden={value !== index} id={`finance-settings-tabpanel-${index}`} aria-labelledby={`finance-settings-tab-${index}`} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

function a11yProps(index: number) {
  return {
    id: `finance-settings-tab-${index}`,
    "aria-controls": `finance-settings-tabpanel-${index}`,
  }
}

interface FinanceSettingsState {
  // Organization Profile
  organizationName: string
  organizationAddress: {
    street: string
    city: string
    state: string
    postalCode: string
    country: string
  }
  registrationNumber: string
  taxId: string
  vatNumber: string

  // Financial Year
  fiscalYearStart: string // MM-DD format
  fiscalYearType: "calendar" | "custom"

  // Currency
  currency: string
  multiCurrencyEnabled: boolean

  // Tax Settings
  taxEnabled: boolean
  taxMode: "inclusive" | "exclusive"
  defaultTaxRate: string // Tax rate ID
  taxReportingBasis: "cash" | "accrual"

  // Invoice Numbering
  invoicePrefix: string
  invoiceNumber: number
  invoiceNumberFormat: "sequential" | "date_based" | "custom"
  invoiceNumberPadding: number

  // Bill Numbering
  billPrefix: string
  billNumber: number
  billNumberFormat: "sequential" | "date_based" | "custom"
  billNumberPadding: number

  // Credit Note Numbering
  creditNotePrefix: string
  creditNoteNumber: number
  creditNoteNumberFormat: "sequential" | "date_based" | "custom"
  creditNoteNumberPadding: number

  // Payment Terms
  defaultPaymentTerms: number
  paymentTermsOptions: number[]

  // Late Fees
  lateFeeEnabled: boolean
  lateFeeRate: number
  lateFeeAmount: number
  lateFeeGracePeriod: number

  // Reminders
  autoReminders: boolean
  reminderDays: number[]

  // Approval Workflows
  requireInvoiceApproval: boolean
  requireBillApproval: boolean
  requireExpenseApproval: boolean
  requireJournalApproval: boolean

  // Lock Dates
  lockDate: string
  lockDateByPeriod: boolean
  allowBackdating: boolean
  backdatingLimit: number

  // Import/Export
  defaultDateFormat: string
  csvDelimiter: string
  exportFormat: "csv" | "xlsx" | "pdf"
}

const FinanceSettings: React.FC = () => {
  const location = useLocation()
  const { loadFinanceSettings, saveFinanceSettings, loadFinanceIntegrations, saveFinanceIntegration } = useFinance()
  const { canView, canEdit } = usePermission()
  const canViewPage = canView("finance", "settings")
  const canMutate = canEdit("finance", "settings")

  const [activeTab, setActiveTab] = useState(0)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [settings, setSettings] = useState<FinanceSettingsState>({
    organizationName: "",
    organizationAddress: { street: "", city: "", state: "", postalCode: "", country: "UK" },
    registrationNumber: "",
    taxId: "",
    vatNumber: "",

    fiscalYearStart: "04-01",
    fiscalYearType: "custom",

    currency: "GBP",
    multiCurrencyEnabled: false,

    taxEnabled: true,
    taxMode: "exclusive",
    defaultTaxRate: "",
    taxReportingBasis: "accrual",

    invoicePrefix: "INV",
    invoiceNumber: 1,
    invoiceNumberFormat: "sequential",
    invoiceNumberPadding: 5,

    billPrefix: "BILL",
    billNumber: 1,
    billNumberFormat: "sequential",
    billNumberPadding: 5,

    creditNotePrefix: "CN",
    creditNoteNumber: 1,
    creditNoteNumberFormat: "sequential",
    creditNoteNumberPadding: 5,

    defaultPaymentTerms: 30,
    paymentTermsOptions: [7, 14, 30, 60, 90],

    lateFeeEnabled: false,
    lateFeeRate: 0,
    lateFeeAmount: 0,
    lateFeeGracePeriod: 0,

    autoReminders: true,
    reminderDays: [7, 14, 30],

    requireInvoiceApproval: false,
    requireBillApproval: false,
    requireExpenseApproval: true,
    requireJournalApproval: true,

    lockDate: "",
    lockDateByPeriod: false,
    allowBackdating: true,
    backdatingLimit: 30,

    defaultDateFormat: "DD/MM/YYYY",
    csvDelimiter: ",",
    exportFormat: "csv",
  })

  // Integration modal state (compact + consistent)
  const [integrationModalOpen, setIntegrationModalOpen] = useState(false)
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [integrationConfig, setIntegrationConfig] = useState<Record<string, any>>({})

  useEffect(() => {
    const load = async () => {
      try {
        const val = (await loadFinanceSettings()) || {}
        setSettings((prev) => ({ ...prev, ...(val as any) }))
      } catch {
        // no loading UI; show error only if needed
      }
    }
    load()
  }, [loadFinanceSettings])

  const handleChange = (field: keyof FinanceSettingsState, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }))
  }

  const save = async () => {
    if (!canMutate) {
      setError("You don't have permission to edit Finance Settings.")
      return
    }
    try {
      setSaving(true)
      setError(null)
      await saveFinanceSettings(settings as any)
      setSuccess("Settings saved successfully")
    } catch {
      setError("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const loadIntegrationsOverride = useCallback(async () => await loadFinanceIntegrations(), [loadFinanceIntegrations])
  const saveIntegrationOverride = useCallback(async (integration: Integration) => await saveFinanceIntegration(integration as any), [saveFinanceIntegration])

  const availableIntegrations: Integration[] = useMemo(
    () => [
      {
        id: "xero",
        name: "Xero",
        description: "Sync invoices, contacts, and accounts with Xero",
        icon: "📘",
        enabled: false,
      },
      {
        id: "quickbooks",
        name: "QuickBooks",
        description: "Connect your QuickBooks company for accounting sync",
        icon: "🧾",
        enabled: false,
      },
      {
        id: "bank-feeds",
        name: "Bank Feeds",
        description: "Import transactions via open banking / bank feeds",
        icon: "🏦",
        enabled: false,
      },
    ],
    [],
  )

  const openIntegrationModal = (integration: Integration) => {
    setSelectedIntegration(integration)
    setIntegrationConfig(integration.config || {})
    setIntegrationModalOpen(true)
  }

  const saveIntegrationConfig = async () => {
    if (!selectedIntegration) return
    if (!canMutate) {
      setError("You don't have permission to edit Finance Integrations.")
      return
    }
    const integrationSnapshot = selectedIntegration
    await saveFinanceIntegration({
      ...selectedIntegration,
      config: integrationConfig,
      updatedAt: Date.now(),
    } as any)
    removeWorkspaceFormDraft(location.pathname, {
      crudEntity: "financeIntegration",
      crudMode: "edit",
      id: integrationSnapshot.id,
      itemLabel: integrationSnapshot.name,
    })
    setIntegrationModalOpen(false)
    setSuccess("Integration saved")
  }

  const tabs = [
    { label: "General", icon: <SettingsIcon /> },
    { label: "Controls", icon: <ControlsIcon /> },
    { label: "Integrations", icon: <IntegrationIcon /> },
  ]

  return (
    <Box sx={{ width: "100%", pt: 2 }}>
      {!canViewPage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          You don't have permission to view Finance Settings.
        </Alert>
      )}
      {!canMutate && canViewPage && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You have view-only access to Finance Settings.
        </Alert>
      )}
      <Snackbar open={!!success} autoHideDuration={6000} onClose={() => setSuccess(null)} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
        <Alert onClose={() => setSuccess(null)} severity="success">
          {success}
        </Alert>
      </Snackbar>

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
        <Alert onClose={() => setError(null)} severity="error">
          {error}
        </Alert>
      </Snackbar>

      <Paper sx={{ width: "100%" }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider", display: "flex", justifyContent: "space-between", alignItems: "center", px: 2 }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} aria-label="Finance settings tabs" variant="scrollable" scrollButtons="auto">
            {tabs.map((tab, index) => (
              <Tab key={index} label={tab.label} icon={tab.icon} iconPosition="start" {...a11yProps(index)} />
            ))}
          </Tabs>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={saving || !canMutate || !canViewPage}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </Box>

        {/* General */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ px: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Finance defaults apply for invoices, bills, approvals, and reporting.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormSection title="Organization" subtitle="Used on documents and reports.">
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField fullWidth label="Organization name" value={settings.organizationName} onChange={(e) => handleChange("organizationName", e.target.value)} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField fullWidth label="Registration number" value={settings.registrationNumber} onChange={(e) => handleChange("registrationNumber", e.target.value)} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField fullWidth label="Tax ID" value={settings.taxId} onChange={(e) => handleChange("taxId", e.target.value)} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField fullWidth label="VAT number" value={settings.vatNumber} onChange={(e) => handleChange("vatNumber", e.target.value)} />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Street address"
                        value={settings.organizationAddress.street}
                        onChange={(e) => handleChange("organizationAddress", { ...settings.organizationAddress, street: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField fullWidth label="City" value={settings.organizationAddress.city} onChange={(e) => handleChange("organizationAddress", { ...settings.organizationAddress, city: e.target.value })} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField fullWidth label="State/Province" value={settings.organizationAddress.state} onChange={(e) => handleChange("organizationAddress", { ...settings.organizationAddress, state: e.target.value })} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField fullWidth label="Postal code" value={settings.organizationAddress.postalCode} onChange={(e) => handleChange("organizationAddress", { ...settings.organizationAddress, postalCode: e.target.value })} />
                    </Grid>
                  </Grid>
                </FormSection>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormSection title="Financial year & currency" subtitle="Reporting and defaults.">
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Fiscal year type</InputLabel>
                    <Select value={settings.fiscalYearType} label="Fiscal year type" onChange={(e) => handleChange("fiscalYearType", e.target.value)}>
                      <MenuItem value="calendar">Calendar</MenuItem>
                      <MenuItem value="custom">Custom</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField fullWidth label="Fiscal year start (MM-DD)" value={settings.fiscalYearStart} onChange={(e) => handleChange("fiscalYearStart", e.target.value)} sx={{ mb: 2 }} />
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Currency</InputLabel>
                    <Select value={settings.currency} label="Currency" onChange={(e) => handleChange("currency", e.target.value)}>
                      <MenuItem value="GBP">GBP (£)</MenuItem>
                      <MenuItem value="EUR">EUR (€)</MenuItem>
                      <MenuItem value="USD">USD ($)</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControlLabel control={<Switch checked={settings.multiCurrencyEnabled} onChange={(e) => handleChange("multiCurrencyEnabled", e.target.checked)} />} label="Enable multi-currency" />
                </FormSection>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormSection title="Tax" subtitle="VAT/tax behavior and reporting basis.">
                  <FormControlLabel control={<Switch checked={settings.taxEnabled} onChange={(e) => handleChange("taxEnabled", e.target.checked)} />} label="Enable tax" sx={{ display: "block", mb: 1 }} />
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Tax mode</InputLabel>
                    <Select value={settings.taxMode} label="Tax mode" onChange={(e) => handleChange("taxMode", e.target.value)}>
                      <MenuItem value="exclusive">Exclusive</MenuItem>
                      <MenuItem value="inclusive">Inclusive</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Reporting basis</InputLabel>
                    <Select value={settings.taxReportingBasis} label="Reporting basis" onChange={(e) => handleChange("taxReportingBasis", e.target.value)}>
                      <MenuItem value="accrual">Accrual</MenuItem>
                      <MenuItem value="cash">Cash</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField fullWidth label="Default tax rate ID" value={settings.defaultTaxRate} onChange={(e) => handleChange("defaultTaxRate", e.target.value)} />
                </FormSection>
              </Grid>

              <Grid item xs={12}>
                <FormSection title="Numbering" subtitle="Document prefixes and next numbers.">
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <TextField fullWidth label="Invoice prefix" value={settings.invoicePrefix} onChange={(e) => handleChange("invoicePrefix", e.target.value)} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField fullWidth label="Next invoice number" type="number" value={settings.invoiceNumber} onChange={(e) => handleChange("invoiceNumber", Number(e.target.value) || 0)} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField fullWidth label="Invoice padding" type="number" value={settings.invoiceNumberPadding} onChange={(e) => handleChange("invoiceNumberPadding", Number(e.target.value) || 0)} />
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <TextField fullWidth label="Bill prefix" value={settings.billPrefix} onChange={(e) => handleChange("billPrefix", e.target.value)} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField fullWidth label="Next bill number" type="number" value={settings.billNumber} onChange={(e) => handleChange("billNumber", Number(e.target.value) || 0)} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField fullWidth label="Bill padding" type="number" value={settings.billNumberPadding} onChange={(e) => handleChange("billNumberPadding", Number(e.target.value) || 0)} />
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <TextField fullWidth label="Credit note prefix" value={settings.creditNotePrefix} onChange={(e) => handleChange("creditNotePrefix", e.target.value)} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField fullWidth label="Next credit note number" type="number" value={settings.creditNoteNumber} onChange={(e) => handleChange("creditNoteNumber", Number(e.target.value) || 0)} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField fullWidth label="Credit note padding" type="number" value={settings.creditNoteNumberPadding} onChange={(e) => handleChange("creditNoteNumberPadding", Number(e.target.value) || 0)} />
                    </Grid>
                  </Grid>
                </FormSection>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormSection title="Payment terms & reminders" subtitle="Defaults for customer and supplier documents.">
                  <TextField fullWidth label="Default payment terms (days)" type="number" value={settings.defaultPaymentTerms} onChange={(e) => handleChange("defaultPaymentTerms", Number(e.target.value) || 0)} sx={{ mb: 2 }} />
                  <FormControlLabel control={<Switch checked={settings.autoReminders} onChange={(e) => handleChange("autoReminders", e.target.checked)} />} label="Enable automatic reminders" sx={{ display: "block" }} />
                  <TextField
                    fullWidth
                    label="Reminder days (comma separated)"
                    value={(settings.reminderDays || []).join(",")}
                    onChange={(e) =>
                      handleChange(
                        "reminderDays",
                        e.target.value
                          .split(",")
                          .map((s) => Number(s.trim()))
                          .filter((n) => !Number.isNaN(n)),
                      )
                    }
                    sx={{ mt: 2 }}
                  />
                </FormSection>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormSection title="Import / export" subtitle="CSV import defaults and export format.">
                  <TextField fullWidth label="Default date format" value={settings.defaultDateFormat} onChange={(e) => handleChange("defaultDateFormat", e.target.value)} sx={{ mb: 2 }} />
                  <TextField fullWidth label="CSV delimiter" value={settings.csvDelimiter} onChange={(e) => handleChange("csvDelimiter", e.target.value)} sx={{ mb: 2 }} />
                  <FormControl fullWidth>
                    <InputLabel>Export format</InputLabel>
                    <Select value={settings.exportFormat} label="Export format" onChange={(e) => handleChange("exportFormat", e.target.value)}>
                      <MenuItem value="csv">CSV</MenuItem>
                      <MenuItem value="xlsx">XLSX</MenuItem>
                      <MenuItem value="pdf">PDF</MenuItem>
                    </Select>
                  </FormControl>
                </FormSection>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* Controls */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ px: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Control approvals, lock dates, and backdating rules.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormSection title="Approvals" subtitle="Require approvals before posting.">
                  <FormControlLabel control={<Switch checked={settings.requireInvoiceApproval} onChange={(e) => handleChange("requireInvoiceApproval", e.target.checked)} />} label="Require invoice approval" sx={{ display: "block" }} />
                  <FormControlLabel control={<Switch checked={settings.requireBillApproval} onChange={(e) => handleChange("requireBillApproval", e.target.checked)} />} label="Require bill approval" sx={{ display: "block" }} />
                  <FormControlLabel control={<Switch checked={settings.requireExpenseApproval} onChange={(e) => handleChange("requireExpenseApproval", e.target.checked)} />} label="Require expense approval" sx={{ display: "block" }} />
                  <FormControlLabel control={<Switch checked={settings.requireJournalApproval} onChange={(e) => handleChange("requireJournalApproval", e.target.checked)} />} label="Require journal approval" sx={{ display: "block" }} />
                </FormSection>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormSection title="Lock dates & backdating" subtitle="Protect closed periods.">
                  <TextField fullWidth label="Lock date (YYYY-MM-DD)" value={settings.lockDate} onChange={(e) => handleChange("lockDate", e.target.value)} sx={{ mb: 2 }} />
                  <FormControlLabel control={<Switch checked={settings.lockDateByPeriod} onChange={(e) => handleChange("lockDateByPeriod", e.target.checked)} />} label="Lock by period" sx={{ display: "block", mb: 1 }} />
                  <FormControlLabel control={<Switch checked={settings.allowBackdating} onChange={(e) => handleChange("allowBackdating", e.target.checked)} />} label="Allow backdating" sx={{ display: "block", mb: 2 }} />
                  <TextField fullWidth label="Backdating limit (days)" type="number" value={settings.backdatingLimit} onChange={(e) => handleChange("backdatingLimit", Number(e.target.value) || 0)} />
                </FormSection>
              </Grid>

              <Grid item xs={12}>
                <FormSection title="Late fees" subtitle="Optional late fee rules for overdue invoices.">
                  <FormControlLabel control={<Switch checked={settings.lateFeeEnabled} onChange={(e) => handleChange("lateFeeEnabled", e.target.checked)} />} label="Enable late fees" sx={{ display: "block", mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <TextField fullWidth label="Rate (%)" type="number" value={settings.lateFeeRate} onChange={(e) => handleChange("lateFeeRate", Number(e.target.value) || 0)} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField fullWidth label="Flat amount" type="number" value={settings.lateFeeAmount} onChange={(e) => handleChange("lateFeeAmount", Number(e.target.value) || 0)} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField fullWidth label="Grace period (days)" type="number" value={settings.lateFeeGracePeriod} onChange={(e) => handleChange("lateFeeGracePeriod", Number(e.target.value) || 0)} />
                    </Grid>
                  </Grid>
                </FormSection>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* Integrations */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ px: 2 }}>
            <FormSection title="Integrations" subtitle="Click an integration to open setup.">
              <IntegrationManager
                module="finance"
                layout="compact"
                hideConfigureButton={true}
                availableIntegrations={availableIntegrations}
                loadIntegrationsOverride={loadIntegrationsOverride}
                saveIntegrationOverride={saveIntegrationOverride}
                onIntegrationClick={(integration) => openIntegrationModal(integration)}
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
              workspaceFormShortcut={
                selectedIntegration
                  ? {
                      crudEntity: "financeIntegration",
                      crudMode: "edit",
                      id: selectedIntegration.id,
                      itemLabel: selectedIntegration.name,
                    }
                  : undefined
              }
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
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Client ID / API Key"
                      value={integrationConfig.clientId || integrationConfig.apiKey || ""}
                      onChange={(e) => setIntegrationConfig((p) => ({ ...p, clientId: e.target.value, apiKey: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Client Secret / API Secret"
                      type="password"
                      value={integrationConfig.clientSecret || integrationConfig.apiSecret || ""}
                      onChange={(e) => setIntegrationConfig((p) => ({ ...p, clientSecret: e.target.value, apiSecret: e.target.value }))}
                    />
                  </Grid>
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

export default FinanceSettings

