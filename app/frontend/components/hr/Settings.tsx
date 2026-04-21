"use client"
import { useLocation } from "react-router-dom"

import React, { useMemo, useState, useEffect, useCallback } from "react"
import {
  Box,
  Tabs,
  Tab,
  Paper,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  Typography,
} from "@mui/material"
import { Save as SaveIcon } from "@mui/icons-material"
import { useHR } from "../../../backend/context/HRContext"
import { useCompany } from "../../../backend/context/CompanyContext"
import {
  Settings as SettingsIcon,
  Gavel as ComplianceIcon,
  IntegrationInstructions as IntegrationIcon,
} from "@mui/icons-material"
import HMRCSettingsTab from "./settings/HMRCSettingsTab"
import RTISubmissionTab from "./settings/RTISubmissionTab"
import IntegrationManager from "../reusable/IntegrationManager"
import FormSection from "../reusable/FormSection"
import CRUDModal, { isCrudModalHardDismiss } from "../reusable/CRUDModal"
import { functions, httpsCallable } from "../../../backend/services/Firebase"

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
      id={`hr-settings-tabpanel-${index}`}
      aria-labelledby={`hr-settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

function a11yProps(index: number) {
  return {
    id: `hr-settings-tab-${index}`,
    'aria-controls': `hr-settings-tabpanel-${index}`,
  }
}

const HRSettings: React.FC = () => {
  const location = useLocation()
  const [activeTab, setActiveTab] = useState(0)

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }

  const tabs = [
    {
      label: "General",
      icon: <SettingsIcon />,
      component: <GeneralHRSettingsTab />,
    },
    {
      label: "Integrations",
      icon: <IntegrationIcon />,
      component: <IntegrationsSettingsTab />,
    },
    {
      label: "Compliance",
      icon: <ComplianceIcon />,
      component: <ComplianceSettingsTab />,
    },
  ]

  return (
    <Box sx={{ width: "100%", pt: 2 }}>
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
            onChange={handleTabChange}
            aria-label="HR settings tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                label={tab.label}
                icon={tab.icon}
                iconPosition="start"
                {...a11yProps(index)}
              />
            ))}
          </Tabs>
          {/* Save handled inside each tab to keep scope clear; button kept here for visual parity with Stock Settings. */}
          <Button variant="contained" startIcon={<SaveIcon />} disabled>
            Save
          </Button>
        </Box>

        {tabs.map((tab, index) => (
          <TabPanel key={index} value={activeTab} index={index}>
            {tab.component}
          </TabPanel>
        ))}
      </Paper>
    </Box>
  )
}

// General HR Settings Tab Component
const GeneralHRSettingsTab: React.FC = () => {
  const { loadHRSettingsSection, saveHRSettingsSection } = useHR()
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [settings, setSettings] = useState({
    // Notifications
    documentExpiryNotifications: true,
    rightToWorkExpiryNotifications: true,

    // Payroll defaults
    defaultPaymentFrequency: "monthly" as "weekly" | "fortnightly" | "four_weekly" | "monthly",
    defaultPayDay: 25,
    defaultTaxCode: "1257L",
    defaultNICategory: "A",
    defaultPensionScheme: "",
    defaultPensionSchemeReference: "",
    autoEnrolmentPostponement: 0,
    payrollProcessingOption: "manual" as "manual" | "assisted" | "automatic",

    // Holidays / work week
    holidayYearStart: "2026-01-01",
    holidayYearEnd: "2026-12-31",
    defaultWorkWeekHours: 40,
    defaultHolidayEntitlement: 28,
    probationPeriodDays: 90,

    // Scheduling
    salaryDividedByDay: false,
    splitSalaryAndHourlyCosts: false,
  })

  useEffect(() => {
    const load = async () => {
      try {
        const val = await loadHRSettingsSection("general")
        if (val) setSettings((prev) => ({ ...prev, ...val }))
      } catch (err: any) {
        console.error("Error loading HR general settings:", err)
      }
    }
    load()
  }, [loadHRSettingsSection])

  const saveSettings = async () => {
    try {
      setSaving(true)
      setError(null)
      await saveHRSettingsSection("general", settings as any)
      setSuccess("Settings saved successfully")
    } catch (err: any) {
      console.error("Error saving HR general settings:", err)
      setError("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box sx={{ px: 2 }}>
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

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        General HR defaults apply when creating new employees and payroll records.
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <FormSection
            title="Notifications"
            subtitle="Expiry reminders for employee compliance documents."
          >
            <FormControlLabel
              control={
                <Switch
                  checked={settings.documentExpiryNotifications}
                  onChange={(e) => setSettings({ ...settings, documentExpiryNotifications: e.target.checked })}
                />
              }
              label="Document expiry notifications"
              sx={{ display: "block", mb: 1 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.rightToWorkExpiryNotifications}
                  onChange={(e) => setSettings({ ...settings, rightToWorkExpiryNotifications: e.target.checked })}
                />
              }
              label="Right to work expiry notification"
              sx={{ display: "block" }}
            />
          </FormSection>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormSection
            title="Payroll defaults"
            subtitle="Defaults used for new starters and payroll processing."
          >
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Default payment frequency</InputLabel>
                  <Select
                    value={settings.defaultPaymentFrequency}
                    label="Default payment frequency"
                    onChange={(e) =>
                      setSettings({ ...settings, defaultPaymentFrequency: e.target.value as any })
                    }
                  >
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="fortnightly">Fortnightly</MenuItem>
                    <MenuItem value="four_weekly">Four weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Default pay day"
                  value={settings.defaultPayDay}
                  onChange={(e) => setSettings({ ...settings, defaultPayDay: parseInt(e.target.value) || 1 })}
                  inputProps={{ min: 1, max: 31 }}
                  helperText="1–31 for monthly, or 1–7 for weekly"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Default tax code"
                  value={settings.defaultTaxCode}
                  onChange={(e) => setSettings({ ...settings, defaultTaxCode: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Default NI category</InputLabel>
                  <Select
                    value={settings.defaultNICategory}
                    label="Default NI category"
                    onChange={(e) => setSettings({ ...settings, defaultNICategory: e.target.value })}
                  >
                    <MenuItem value="A">A - Standard</MenuItem>
                    <MenuItem value="B">B - Married Women</MenuItem>
                    <MenuItem value="C">C - Over State Pension Age</MenuItem>
                    <MenuItem value="H">H - Apprentice Under 25</MenuItem>
                    <MenuItem value="M">M - Under 21</MenuItem>
                    <MenuItem value="Z">Z - Under 21 Deferred</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Default pension scheme"
                  value={settings.defaultPensionScheme}
                  onChange={(e) => setSettings({ ...settings, defaultPensionScheme: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Pension scheme reference (PSTR)"
                  value={settings.defaultPensionSchemeReference}
                  onChange={(e) => setSettings({ ...settings, defaultPensionSchemeReference: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Auto-enrolment postponement (months)"
                  value={settings.autoEnrolmentPostponement}
                  onChange={(e) => setSettings({ ...settings, autoEnrolmentPostponement: parseInt(e.target.value) || 0 })}
                  inputProps={{ min: 0, max: 3 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Payroll processing option</InputLabel>
                  <Select
                    value={settings.payrollProcessingOption}
                    label="Payroll processing option"
                    onChange={(e) => setSettings({ ...settings, payrollProcessingOption: e.target.value as any })}
                  >
                    <MenuItem value="manual">Manual</MenuItem>
                    <MenuItem value="assisted">Assisted</MenuItem>
                    <MenuItem value="automatic">Automatic</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </FormSection>
        </Grid>

        <Grid item xs={12}>
          <FormSection
            title="Holidays & work week"
            subtitle="Holiday year dates, default holidays, and probation period."
          >
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Holiday year start"
                  type="date"
                  value={settings.holidayYearStart}
                  onChange={(e) => setSettings({ ...settings, holidayYearStart: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Holiday year end"
                  type="date"
                  value={settings.holidayYearEnd}
                  onChange={(e) => setSettings({ ...settings, holidayYearEnd: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  label="Default work week (hours)"
                  type="number"
                  value={settings.defaultWorkWeekHours}
                  onChange={(e) => setSettings({ ...settings, defaultWorkWeekHours: parseInt(e.target.value) || 0 })}
                  inputProps={{ min: 0, max: 80 }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  label="Default holidays (days)"
                  type="number"
                  value={settings.defaultHolidayEntitlement}
                  onChange={(e) => setSettings({ ...settings, defaultHolidayEntitlement: parseInt(e.target.value) || 0 })}
                  inputProps={{ min: 0, max: 60 }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  label="Probation (days)"
                  type="number"
                  value={settings.probationPeriodDays}
                  onChange={(e) => setSettings({ ...settings, probationPeriodDays: parseInt(e.target.value) || 0 })}
                  inputProps={{ min: 0, max: 365 }}
                />
              </Grid>
            </Grid>

            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={saveSettings} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </Box>
          </FormSection>
        </Grid>

        <Grid item xs={12}>
          <FormSection
            title="Scheduling"
            subtitle="Configure how costs are calculated and displayed in the schedule."
          >
            <FormControlLabel
              control={
                <Switch
                  checked={settings.salaryDividedByDay}
                  onChange={(e) => setSettings({ ...settings, salaryDividedByDay: e.target.checked })}
                />
              }
              label="Salary divided by day"
              sx={{ display: "block", mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, ml: 4 }}>
              When enabled, salaried staff costs are divided equally by day (salary/365 per day) regardless of hours worked.
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.splitSalaryAndHourlyCosts}
                  onChange={(e) => setSettings({ ...settings, splitSalaryAndHourlyCosts: e.target.checked })}
                />
              }
              label="Split salary and hourly costs"
              sx={{ display: "block" }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, ml: 4 }}>
              When enabled, creates separate cost rows at the top of the schedule for salary and hourly costs.
            </Typography>

            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={saveSettings} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </Box>
          </FormSection>
        </Grid>
      </Grid>
      <Snackbar open={!!success} autoHideDuration={6000} onClose={() => setSuccess(null)}>
        <Alert severity="success">{success}</Alert>
      </Snackbar>
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
        <Alert severity="error">{error}</Alert>
      </Snackbar>
    </Box>
  )
}

const ComplianceSettingsTab: React.FC = () => {
  const { loadHRSettingsSection, saveHRSettingsSection } = useHR()
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [settings, setSettings] = useState({
    requireRightToWork: true,
    requireContractSigned: true,
    requireNINumber: true,
    requireTaxCode: true,
    trackDocumentExpiry: true,
    minimumAge: 16,
  })

  useEffect(() => {
    const load = async () => {
      try {
        const val = await loadHRSettingsSection("compliance")
        if (val) setSettings((prev) => ({ ...prev, ...val }))
      } catch (err: any) {
        console.error("Error loading HR compliance settings:", err)
        // silent - no loading UI
      }
    }
    load()
  }, [loadHRSettingsSection])

  const save = async () => {
    try {
      setSaving(true)
      setError(null)
      await saveHRSettingsSection("compliance", settings as any)
      setSuccess("Settings saved successfully")
    } catch (err: any) {
      console.error("Error saving HR compliance settings:", err)
      setError("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box sx={{ px: 2 }}>
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

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Compliance defaults help enforce consistent onboarding and document checks.
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <FormSection title="Onboarding requirements" subtitle="Defaults applied when adding employees.">
            <FormControlLabel
              control={<Switch checked={settings.requireRightToWork} onChange={(e) => setSettings({ ...settings, requireRightToWork: e.target.checked })} />}
              label="Require right to work evidence"
              sx={{ display: "block" }}
            />
            <FormControlLabel
              control={<Switch checked={settings.requireContractSigned} onChange={(e) => setSettings({ ...settings, requireContractSigned: e.target.checked })} />}
              label="Require signed contract"
              sx={{ display: "block" }}
            />
          </FormSection>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormSection title="Payroll checks" subtitle="Enforce minimum details for payroll setup.">
            <FormControlLabel
              control={<Switch checked={settings.requireNINumber} onChange={(e) => setSettings({ ...settings, requireNINumber: e.target.checked })} />}
              label="Require NI number"
              sx={{ display: "block" }}
            />
            <FormControlLabel
              control={<Switch checked={settings.requireTaxCode} onChange={(e) => setSettings({ ...settings, requireTaxCode: e.target.checked })} />}
              label="Require tax code"
              sx={{ display: "block" }}
            />
          </FormSection>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormSection title="Document tracking" subtitle="Expiry monitoring and reminders.">
            <FormControlLabel
              control={<Switch checked={settings.trackDocumentExpiry} onChange={(e) => setSettings({ ...settings, trackDocumentExpiry: e.target.checked })} />}
              label="Track document expiry"
              sx={{ display: "block" }}
            />
          </FormSection>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormSection title="Minimum age" subtitle="Prevent accidental underage hiring.">
            <TextField
              fullWidth
              label="Minimum age"
              type="number"
              value={settings.minimumAge}
              onChange={(e) => setSettings({ ...settings, minimumAge: Number(e.target.value) || 0 })}
            />
          </FormSection>
        </Grid>
      </Grid>

      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </Box>
    </Box>
  )
}

const IntegrationsSettingsTab: React.FC = () => {
  const { loadHRIntegrations, saveHRIntegration } = useHR()
  const { state: companyState } = useCompany()
  const [selectedIntegration, setSelectedIntegration] = useState<any | null>(null)
  const [integrationModalOpen, setIntegrationModalOpen] = useState(false)
  const [mailboxEmail, setMailboxEmail] = useState("")
  const [mailboxSenderName, setMailboxSenderName] = useState("1Stop HR")
  const [mailboxPassword, setMailboxPassword] = useState("")
  const [mailboxHasPassword, setMailboxHasPassword] = useState(false)
  const [mailboxUpdatedAt, setMailboxUpdatedAt] = useState<number | null>(null)
  const [mailboxSaving, setMailboxSaving] = useState(false)
  const [mailboxError, setMailboxError] = useState<string | null>(null)
  const [mailboxSuccess, setMailboxSuccess] = useState<string | null>(null)

  const loadIntegrationsOverride = useCallback(async () => await loadHRIntegrations(), [loadHRIntegrations])
  const saveIntegrationOverride = useCallback(async (integration: any) => await saveHRIntegration(integration), [saveHRIntegration])

  const availableIntegrations = useMemo(
    () => [
      {
        id: "hmrc",
        name: "HMRC",
        description: "Payroll RTI submissions and HMRC configuration",
        icon: "🏛️",
        enabled: false,
      },
    ],
    [],
  )

  useEffect(() => {
    const loadMailboxStatus = async () => {
      if (!functions || !companyState.companyID) return
      try {
        const getMailboxStatus = httpsCallable(functions, "getMailboxSecretSettingsStatus")
        const result = await getMailboxStatus({
          companyId: companyState.companyID,
          siteId: companyState.selectedSiteID || "default",
          subsiteId: companyState.selectedSubsiteID || "default",
          configType: "hr",
        })
        const data = (result.data || {}) as any
        setMailboxEmail(data.email || "")
        setMailboxSenderName(data.senderName || "1Stop HR")
        setMailboxHasPassword(Boolean(data.hasAppPassword))
        setMailboxUpdatedAt(typeof data.updatedAt === "number" ? data.updatedAt : null)
      } catch (err: any) {
        setMailboxError(err?.message || "Failed to load HR mailbox status")
      }
    }

    loadMailboxStatus()
  }, [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const handleSaveMailbox = async () => {
    setMailboxError(null)
    setMailboxSuccess(null)
    if (!companyState.companyID) {
      setMailboxError("Company ID not found")
      return
    }
    if (!mailboxEmail.trim()) {
      setMailboxError("Mailbox email is required")
      return
    }
    if (!mailboxPassword.trim() && !mailboxHasPassword) {
      setMailboxError("App password is required for the first secure save")
      return
    }
    if (!functions) {
      setMailboxError("Firebase Functions is not available")
      return
    }

    setMailboxSaving(true)
    try {
      const saveMailboxStatus = httpsCallable(functions, "saveMailboxSecretSettings")
      const result = await saveMailboxStatus({
        companyId: companyState.companyID,
        siteId: companyState.selectedSiteID || "default",
        subsiteId: companyState.selectedSubsiteID || "default",
        configType: "hr",
        email: mailboxEmail.trim(),
        senderName: mailboxSenderName.trim() || "1Stop HR",
        appPassword: mailboxPassword.trim() || undefined,
      })
      const data = (result.data || {}) as any
      setMailboxEmail(data.email || mailboxEmail.trim())
      setMailboxSenderName(data.senderName || mailboxSenderName.trim() || "1Stop HR")
      setMailboxHasPassword(Boolean(data.hasAppPassword))
      setMailboxUpdatedAt(typeof data.updatedAt === "number" ? data.updatedAt : Date.now())
      setMailboxPassword("")
      setMailboxSuccess("HR mailbox saved securely")
    } catch (err: any) {
      setMailboxError(err?.message || "Failed to save HR mailbox")
    } finally {
      setMailboxSaving(false)
    }
  }

  return (
    <Box sx={{ px: 2 }}>
      {mailboxError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {mailboxError}
        </Alert>
      ) : null}
      {mailboxSuccess ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          {mailboxSuccess}
        </Alert>
      ) : null}

      <FormSection title="HR Mailbox" subtitle="Store the HR sender mailbox password securely on the server.">
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Mailbox Email"
              value={mailboxEmail}
              onChange={(e) => setMailboxEmail(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Sender Name"
              value={mailboxSenderName}
              onChange={(e) => setMailboxSenderName(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="password"
              label={mailboxHasPassword ? "Replace App Password" : "App Password"}
              value={mailboxPassword}
              onChange={(e) => setMailboxPassword(e.target.value)}
              helperText={mailboxHasPassword ? "Leave blank to keep the current stored password." : "Required for the first secure save."}
            />
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Typography variant="caption" color="text.secondary">
                {mailboxHasPassword ? "Server-side password stored." : "No server-side password stored yet."}
                {mailboxUpdatedAt ? ` Last updated: ${new Date(mailboxUpdatedAt).toLocaleString()}` : ""}
              </Typography>
              <Button variant="outlined" onClick={handleSaveMailbox} disabled={mailboxSaving}>
                {mailboxSaving ? "Saving..." : "Save Mailbox Securely"}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </FormSection>

      <FormSection title="Integrations" subtitle="Click an integration to open full setup.">
        <IntegrationManager
          module="hr"
          layout="compact"
          hideConfigureButton={true}
          loadIntegrationsOverride={loadIntegrationsOverride}
          saveIntegrationOverride={saveIntegrationOverride}
          availableIntegrations={availableIntegrations as any}
          onIntegrationClick={(integration) => {
            setSelectedIntegration(integration)
            setIntegrationModalOpen(true)
          }}
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
          crudEntity: "settingsModal1",
          crudMode: "edit",
          id: selectedIntegration?.id,
          itemLabel: selectedIntegration?.name,
        }}
        title={selectedIntegration?.name || "Integration"}
        subtitle="Setup and manage the integration"
        icon={<IntegrationIcon />}
        mode="edit"
        onSave={() => setIntegrationModalOpen(false)}
        saveButtonText="Close"
        cancelButtonText={undefined}
        hideCloseButton={true}
        hideCloseAction={true}
      >
        {selectedIntegration?.id === "hmrc" ? (
          <>
            <HMRCSettingsTab embedded />
            <Box sx={{ height: 16 }} />
            <RTISubmissionTab embedded />
          </>
        ) : (
          <Alert severity="info">Select an integration.</Alert>
        )}
      </CRUDModal>
    </Box>
  )
}

export default HRSettings
