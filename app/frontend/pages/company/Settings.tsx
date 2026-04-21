/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Switch,
  Tab,
  Tabs,
  Typography,
} from "@mui/material"
import { Alert as MuiAlert } from "@mui/material"
import {
  AutoAwesome as AutoSaveIcon,
  Edit as EditIcon,
  IntegrationInstructions as IntegrationIcon,
  Save as SaveIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material"
import FormSection from "../../components/reusable/FormSection"
import IntegrationManager, { type Integration } from "../../components/reusable/IntegrationManager"
import { useCompany } from "../../../backend/context/CompanyContext"

type ReportSectionKey = "shift" | "finance" | "bookings" | "maintenance" | "stock"

// Shift report is always enabled (not configurable)
const CONFIGURABLE_REPORT_SECTIONS: Array<{ key: Exclude<ReportSectionKey, "shift">; label: string }> = [
  { key: "finance", label: "Finance report" },
  { key: "bookings", label: "Bookings report" },
  { key: "maintenance", label: "Maintenance report" },
  { key: "stock", label: "Stock report" },
]

const defaultReportSectionVisibility = (): Record<ReportSectionKey, boolean> => ({
  shift: true,
  finance: true,
  bookings: true,
  maintenance: true,
  stock: true,
})

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
      id={`company-settings-tabpanel-${index}`}
      aria-labelledby={`company-settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

function a11yProps(index: number) {
  return {
    id: `company-settings-tab-${index}`,
    "aria-controls": `company-settings-tabpanel-${index}`,
  }
}

interface CompanySectionSettingsState {
  enableJoinByCode: boolean
  joinCodeExpiryDays: number
  defaultRole: string
  defaultDepartment: string
  reportsDefaultStatus: "draft" | "published"
  reportSectionVisibility: Record<ReportSectionKey, boolean>
}

const CompanySettings: React.FC = () => {
  const {
    state,
    hasPermission,
    loadCompanySectionSettings,
    saveCompanySectionSettings,
  } = useCompany()

  const canEdit = hasPermission("company", "settings", "edit")

  const [activeTab, setActiveTab] = useState(0)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [settings, setSettings] = useState<CompanySectionSettingsState>({
    enableJoinByCode: true,
    joinCodeExpiryDays: 14,
    defaultRole: "staff",
    defaultDepartment: "front-of-house",
    reportsDefaultStatus: "draft",
    reportSectionVisibility: defaultReportSectionVisibility(),
  })

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!state.companyID) return
      try {
        const v = (await loadCompanySectionSettings()) as any
        if (cancelled) return
        setSettings((prev) => ({
          ...prev,
          enableJoinByCode: v?.enableJoinByCode ?? prev.enableJoinByCode,
          joinCodeExpiryDays: Number.isFinite(Number(v?.joinCodeExpiryDays))
            ? Math.max(1, Math.min(365, Number(v.joinCodeExpiryDays)))
            : prev.joinCodeExpiryDays,
          defaultRole: String(v?.defaultRole || prev.defaultRole),
          defaultDepartment: String(v?.defaultDepartment || prev.defaultDepartment),
          reportsDefaultStatus: (v?.reportsDefaultStatus === "published" ? "published" : "draft"),
          reportSectionVisibility: {
            ...defaultReportSectionVisibility(),
            ...(v?.reportSectionVisibility || {}),
            // Force: shift is always enabled
            shift: true,
          },
        }))
      } catch (e: any) {
        setError(e?.message || "Failed to load settings")
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [state.companyID, loadCompanySectionSettings])

  const handleChange = (field: keyof CompanySectionSettingsState, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }))
  }

  const setReportSectionVisible = (key: ReportSectionKey, visible: boolean) => {
    if (key === "shift") return
    setSettings((prev) => ({
      ...prev,
      reportSectionVisibility: {
        ...(prev.reportSectionVisibility || defaultReportSectionVisibility()),
        [key]: Boolean(visible),
        shift: true,
      },
    }))
  }

  const save = async () => {
    if (!state.companyID) {
      setError("Select a company first")
      return
    }
    if (!canEdit) {
      setError("You don't have permission to edit company settings.")
      return
    }

    const expiry = Number(settings.joinCodeExpiryDays)
    if (!Number.isFinite(expiry) || expiry < 1 || expiry > 365) {
      setError("Join code expiry must be between 1 and 365 days.")
      return
    }

    setSaving(true)
    try {
      setError(null)
      await saveCompanySectionSettings({
        ...settings,
        joinCodeExpiryDays: Math.round(expiry),
        reportSectionVisibility: {
          ...settings.reportSectionVisibility,
          shift: true,
        },
      })
      setSuccess("Settings saved successfully")
      setEditMode(false)
    } catch (e: any) {
      setError(e?.message || "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { label: "General", icon: <SettingsIcon /> },
    { label: "Integrations", icon: <IntegrationIcon /> },
  ]

  const availableIntegrations: Integration[] = useMemo(
    () => [
      {
        id: "slack",
        name: "Slack",
        description: "Send company notifications and workflow updates to Slack",
        icon: "S",
        enabled: false,
      },
      {
        id: "microsoft-teams",
        name: "Microsoft Teams",
        description: "Share company alerts and updates with Microsoft Teams",
        icon: "T",
        enabled: false,
      },
      {
        id: "google-workspace",
        name: "Google Workspace",
        description: "Connect company contacts, calendars, and shared directories",
        icon: "G",
        enabled: false,
      },
    ],
    [],
  )

  return (
    <Box sx={{ width: "100%", px: { xs: 1.5, sm: 2, md: 3 }, py: 2 }}>
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
        autoHideDuration={7000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <MuiAlert onClose={() => setError(null)} severity="error">
          {error}
        </MuiAlert>
      </Snackbar>

      <Paper
        variant="outlined"
        sx={{
          width: "100%",
          borderRadius: 2,
          overflow: "hidden",
          bgcolor: "background.paper",
        }}
      >
        <Box
          sx={{
            px: { xs: 1.5, sm: 2 },
            py: 1,
            borderBottom: 1,
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
            bgcolor: "grey.50",
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => {
              setActiveTab(newValue)
              if (newValue !== 0) setEditMode(false)
            }}
            aria-label="Company settings tabs"
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 44,
              "& .MuiTab-root": {
                minHeight: 44,
                textTransform: "none",
                fontWeight: 600,
              },
            }}
          >
            {tabs.map((tab, index) => (
              <Tab
                key={tab.label}
                label={tab.label}
                icon={tab.icon}
                iconPosition="start"
                {...a11yProps(index)}
              />
            ))}
          </Tabs>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {activeTab === 0 ? (
              editMode ? (
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={() => void save()}
                  disabled={saving || !canEdit}
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => {
                    if (!state.companyID) {
                      setError("Select a company first")
                      return
                    }
                    if (!canEdit) {
                      setError("You don't have permission to edit company settings.")
                      return
                    }
                    setEditMode(true)
                  }}
                >
                  Edit
                </Button>
              )
            ) : (
              <Chip
                size="small"
                icon={<AutoSaveIcon fontSize="small" />}
                label="Auto-save"
                variant="outlined"
                color="success"
              />
            )}
          </Box>
        </Box>

        {/* General Tab */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ px: { xs: 1.5, sm: 2 }, pb: 2 }}>
            {!state.companyID ? (
              <Alert severity="info">Select a company to configure settings.</Alert>
            ) : (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormSection title="Reports">
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth disabled={!editMode}>
                          <InputLabel>Default report status</InputLabel>
                          <Select
                            value={settings.reportsDefaultStatus}
                            label="Default report status"
                            onChange={(e) =>
                              handleChange(
                                "reportsDefaultStatus",
                                e.target.value === "published" ? "published" : "draft",
                              )
                            }
                          >
                            <MenuItem value="draft">Draft</MenuItem>
                            <MenuItem value="published">Published</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Alert severity="info">
                          Choose which report sections are visible on the Reports page.
                        </Alert>
                      </Grid>
                      <Grid item xs={12}>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                          {CONFIGURABLE_REPORT_SECTIONS.map((s) => (
                            <Box
                              key={s.key}
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 2,
                                minWidth: { xs: "100%", sm: 260 },
                                flex: "1 1 260px",
                                p: 1,
                                border: "1px solid",
                                borderColor: "divider",
                                borderRadius: 1.5,
                                bgcolor: "background.paper",
                              }}
                            >
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {s.label}
                              </Typography>
                              <Switch
                                checked={Boolean(settings.reportSectionVisibility?.[s.key])}
                                onChange={(e) => setReportSectionVisible(s.key, e.target.checked)}
                                disabled={!editMode}
                                size="small"
                              />
                            </Box>
                          ))}
                        </Box>
                      </Grid>
                    </Grid>
                  </FormSection>
                </Grid>
              </Grid>
            )}
          </Box>
        </TabPanel>

        {/* Integrations Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ px: { xs: 1.5, sm: 2 }, pb: 2 }}>
            {state.companyID && (
              <FormSection
                title="Integrations"
                subtitle="Connect company-wide services. Integration changes save automatically."
              >
                <IntegrationManager
                  module="company"
                  layout="compact"
                  availableIntegrations={availableIntegrations}
                />
              </FormSection>
            )}
            {!state.companyID && <Alert severity="info">Select a company to configure integrations.</Alert>}
            {false && !state.companyID && <Alert severity="info">
              Placeholder removed.
            </Alert>}
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  )
}

export default CompanySettings
