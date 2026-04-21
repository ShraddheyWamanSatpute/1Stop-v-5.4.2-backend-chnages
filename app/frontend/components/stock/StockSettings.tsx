/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import { useLocation } from "react-router-dom"

import React, { useState, useEffect, useCallback } from "react"
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Tooltip,
} from "@mui/material"
import {
  Settings as SettingsIcon,
  IntegrationInstructions as IntegrationIcon,
  Save as SaveIcon,
  Flag as TargetsIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material"
import { useStock } from "../../../backend/context/StockContext"
import IntegrationManager from "../reusable/IntegrationManager"
import { debugWarn } from "../../../utils/debugLog"
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
      id={`stock-settings-tabpanel-${index}`}
      aria-labelledby={`stock-settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

function a11yProps(index: number) {
  return {
    id: `stock-settings-tab-${index}`,
    "aria-controls": `stock-settings-tabpanel-${index}`,
  }
}

interface StockSettingsState {
  // General (only fields requested)
  lowStockAlert: boolean
  outOfStockAlert: boolean
  allowNegativeStock: boolean
  autoReorderEnabled: boolean
  stockDecimalPlaces: 1 | 2 | 3
}

type StockTargetType = "purchasing" | "stockCount"

interface StockTarget {
  id: string
  type: StockTargetType
  gpPercent: number
  purchasingMaxGBP?: number
  stockCountVarianceMaxPercent?: number
  notes?: string
  createdAt: number
  updatedAt: number
}

const StockSettings: React.FC = () => {
  const location = useLocation()
  const {
    loadStockSettings,
    saveStockSettings,
    fetchStockTargets,
    saveStockTarget,
    deleteStockTarget,
    loadStockIntegrations,
    saveStockIntegration,
  } = useStock()
  const [activeTab, setActiveTab] = useState(0)
  // Loading state removed - UI renders instantly, data fills as it arrives (like HR section)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const [settings, setSettings] = useState<StockSettingsState>({
    lowStockAlert: true,
    outOfStockAlert: true,
    allowNegativeStock: false,
    autoReorderEnabled: false,
    stockDecimalPlaces: 2,
  })

  const [targets, setTargets] = useState<StockTarget[]>([])

  // Targets modal state
  const [targetModalOpen, setTargetModalOpen] = useState(false)
  const [targetMode, setTargetMode] = useState<"create" | "edit">("create")
  const [selectedTarget, setSelectedTarget] = useState<StockTarget | null>(null)
  const [targetForm, setTargetForm] = useState<{
    type: StockTargetType
    gpPercent: number
    purchasingMaxGBP: number
    stockCountVarianceMaxPercent: number
    notes: string
  }>({
    type: "purchasing",
    gpPercent: 10,
    purchasingMaxGBP: 10000,
    stockCountVarianceMaxPercent: 2,
    notes: "",
  })

  useEffect(() => {
    loadSettings()
    loadTargets()
  }, [loadStockSettings, fetchStockTargets])

  const loadSettings = async () => {
    try {
      const val = (await loadStockSettings()) || {}
        setSettings((prev) => ({
          ...prev,
          lowStockAlert: val.lowStockAlert ?? prev.lowStockAlert,
          outOfStockAlert: val.outOfStockAlert ?? prev.outOfStockAlert,
          allowNegativeStock: val.allowNegativeStock ?? prev.allowNegativeStock,
          autoReorderEnabled: val.autoReorderEnabled ?? prev.autoReorderEnabled,
          stockDecimalPlaces: (val.stockDecimalPlaces === 1 || val.stockDecimalPlaces === 2 || val.stockDecimalPlaces === 3)
            ? val.stockDecimalPlaces
            : prev.stockDecimalPlaces,
        }))
    } catch (err: any) {
      debugWarn("Error loading stock settings:", err)
      setError("Failed to load settings")
    }
  }

  const loadTargets = async () => {
    try {
      const rawList = (await fetchStockTargets()) || []
      const list: StockTarget[] = rawList.map((t: any) => ({
        id: String(t.id),
        type: t.type === "stockCount" ? "stockCount" : "purchasing",
        gpPercent: Number(t.gpPercent ?? 0),
        purchasingMaxGBP: t.purchasingMaxGBP !== undefined ? Number(t.purchasingMaxGBP) : undefined,
        stockCountVarianceMaxPercent:
          t.stockCountVarianceMaxPercent !== undefined ? Number(t.stockCountVarianceMaxPercent) : undefined,
        notes: t.notes || "",
        createdAt: Number(t.createdAt ?? Date.now()),
        updatedAt: Number(t.updatedAt ?? Date.now()),
      }))

      // newest first
      list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      setTargets(list)
    } catch (err: any) {
      debugWarn("Error loading stock targets:", err)
      setError("Failed to load targets")
    }
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      setError(null)
      await saveStockSettings(settings as any)
      setSuccess("Settings saved successfully")
    } catch (err: any) {
      debugWarn("Error saving stock settings:", err)
      setError("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: keyof StockSettingsState, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }))
  }

  const openCreateTarget = () => {
    setSelectedTarget(null)
    setTargetMode("create")
    setTargetForm({
      type: "purchasing",
      gpPercent: 10,
      purchasingMaxGBP: 10000,
      stockCountVarianceMaxPercent: 2,
      notes: "",
    })
    setTargetModalOpen(true)
  }

  const openEditTarget = (target: StockTarget) => {
    setSelectedTarget(target)
    setTargetMode("edit")
    setTargetForm({
      type: target.type,
      gpPercent: target.gpPercent ?? 0,
      purchasingMaxGBP: target.purchasingMaxGBP ?? 0,
      stockCountVarianceMaxPercent: target.stockCountVarianceMaxPercent ?? 0,
      notes: target.notes || "",
    })
    setTargetModalOpen(true)
  }

  const closeTargetModal = () => {
    setTargetModalOpen(false)
    setSelectedTarget(null)
  }

  const validateTargetForm = () => {
    const gp = Number(targetForm.gpPercent)
    if (!Number.isFinite(gp) || gp < 0 || gp > 100) {
      setError("GP% must be between 0 and 100")
      return false
    }

    if (targetForm.type === "purchasing") {
      const max = Number(targetForm.purchasingMaxGBP)
      if (!Number.isFinite(max) || max < 0) {
        setError("Purchasing target must be a valid non-negative number")
        return false
      }
    } else {
      const maxVar = Number(targetForm.stockCountVarianceMaxPercent)
      if (!Number.isFinite(maxVar) || maxVar < 0 || maxVar > 100) {
        setError("Stock count variance target must be between 0 and 100")
        return false
      }
    }

    return true
  }

  const saveTarget = async () => {
    if (!validateTargetForm()) return

    try {
      const now = Date.now()
      const id =
        targetMode === "edit" && selectedTarget?.id
          ? selectedTarget.id
          : `t_${now}_${Math.random().toString(16).slice(2)}`

      const payload: Omit<StockTarget, "id"> = {
        type: targetForm.type,
        gpPercent: Number(targetForm.gpPercent),
        purchasingMaxGBP:
          targetForm.type === "purchasing" ? Number(targetForm.purchasingMaxGBP) : undefined,
        stockCountVarianceMaxPercent:
          targetForm.type === "stockCount" ? Number(targetForm.stockCountVarianceMaxPercent) : undefined,
        notes: targetForm.notes?.trim() || "",
        createdAt: targetMode === "edit" ? (selectedTarget?.createdAt || now) : now,
        updatedAt: now,
      }

      await saveStockTarget(id, payload as any)
      closeTargetModal()
      await loadTargets()
      setSuccess(targetMode === "edit" ? "Target updated" : "Target created")
    } catch (err: any) {
      debugWarn("Error saving stock target:", err)
      setError("Failed to save target")
    }
  }

  const deleteTarget = async (target: StockTarget) => {
    if (!window.confirm("Delete this target?")) return

    try {
      await deleteStockTarget(target.id)
      await loadTargets()
      setSuccess("Target deleted")
    } catch (err: any) {
      debugWarn("Error deleting stock target:", err)
      setError("Failed to delete target")
    }
  }

  const loadIntegrationsOverride = useCallback(async () => {
    return await loadStockIntegrations()
  }, [loadStockIntegrations])

  const saveIntegrationOverride = useCallback(async (integration: any) => {
    await saveStockIntegration(integration)
  }, [saveStockIntegration])

  const tabs = [
    {
      label: "General",
      icon: <SettingsIcon />,
    },
    {
      label: "Integrations",
      icon: <IntegrationIcon />,
    },
    {
      label: "Targets",
      icon: <TargetsIcon />,
    },
  ]

  // No loading indicators — UI renders and fills as data arrives (like HR section)

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
            aria-label="Stock settings tabs"
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
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={saveSettings}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </Box>

        {/* General Tab */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ px: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              General settings are saved using the <strong>Save</strong> button. Integrations and Targets save automatically.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormSection
                  title="Notifications"
                  subtitle="Notify on stock status changes (low stock and no stock)."
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.lowStockAlert}
                        onChange={(e) => handleChange("lowStockAlert", e.target.checked)}
                      />
                    }
                    label="Notify on low stock"
                    sx={{ display: "block", mb: 1 }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.outOfStockAlert}
                        onChange={(e) => handleChange("outOfStockAlert", e.target.checked)}
                      />
                    }
                    label="Notify on no stock"
                    sx={{ display: "block" }}
                  />
                </FormSection>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormSection
                  title="Stock behaviour"
                  subtitle="Control how stock quantities behave and display."
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.allowNegativeStock}
                        onChange={(e) => handleChange("allowNegativeStock", e.target.checked)}
                      />
                    }
                    label="Allow negative stock"
                    sx={{ display: "block", mb: 1 }}
                  />

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Stock decimal places</InputLabel>
                    <Select
                      value={settings.stockDecimalPlaces}
                      onChange={(e) =>
                        handleChange("stockDecimalPlaces", Number(e.target.value) as 1 | 2 | 3)
                      }
                      label="Stock decimal places"
                    >
                      <MenuItem value={1}>1</MenuItem>
                      <MenuItem value={2}>2</MenuItem>
                      <MenuItem value={3}>3</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.autoReorderEnabled}
                        onChange={(e) => handleChange("autoReorderEnabled", e.target.checked)}
                      />
                    }
                    label="Automatic reordering (auto reorder)"
                    sx={{ display: "block" }}
                  />
                </FormSection>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* Integrations Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ px: 2 }}>
            <FormSection
              title="Integrations"
              subtitle="Connect stock with third-party services. Changes here save automatically."
            >
              <IntegrationManager
                module="stock"
                layout="compact"
                loadIntegrationsOverride={loadIntegrationsOverride}
                saveIntegrationOverride={saveIntegrationOverride}
                availableIntegrations={[
                  {
                    id: "lightspeed",
                    name: "Lightspeed Retail",
                    description: "Sync products and inventory with Lightspeed",
                    icon: "🛒",
                    enabled: false,
                  },
                  {
                    id: "square",
                    name: "Square",
                    description: "Sync inventory with Square POS",
                    icon: "📱",
                    enabled: false,
                  },
                  {
                    id: "shopify",
                    name: "Shopify",
                    description: "Sync products and inventory with Shopify",
                    icon: "🛍️",
                    enabled: false,
                  },
                ]}
              />
            </FormSection>
          </Box>
        </TabPanel>

        {/* Targets Tab */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ px: 2 }}>
            <FormSection
              title="Targets"
              subtitle='Create targets for Purchasing and Stock Count. Example: "GP 10% ⇒ purchasing under £10,000".'
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <Chip
                    size="small"
                    label={`${targets.length} target${targets.length === 1 ? "" : "s"}`}
                    color="primary"
                    variant="outlined"
                  />
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateTarget}>
                  Add Target
                </Button>
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>GP%</TableCell>
                      <TableCell>Target</TableCell>
                      <TableCell>Notes</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {targets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <Typography variant="body2" color="text.secondary">
                            No targets yet. Click <strong>Add Target</strong> to create one.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      targets.map((t) => {
                        const typeLabel = t.type === "purchasing" ? "Purchasing" : "Stock Count"
                        const targetLabel =
                          t.type === "purchasing"
                            ? `Purchasing ≤ £${Number(t.purchasingMaxGBP ?? 0).toLocaleString()}`
                            : `Variance ≤ ${Number(t.stockCountVarianceMaxPercent ?? 0)}%`

                        return (
                          <TableRow key={t.id} hover>
                            <TableCell>
                              <Chip
                                size="small"
                                label={typeLabel}
                                color={t.type === "purchasing" ? "info" : "secondary"}
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>{Number(t.gpPercent ?? 0)}%</TableCell>
                            <TableCell>{targetLabel}</TableCell>
                            <TableCell sx={{ maxWidth: 320 }}>
                              <Typography variant="body2" noWrap title={t.notes || ""}>
                                {t.notes || "—"}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="Edit">
                                <IconButton size="small" onClick={() => openEditTarget(t)}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton size="small" color="error" onClick={() => deleteTarget(t)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

                                                        <CRUDModal
                              open={targetModalOpen}
                              onClose={(reason) => {
                                setTargetModalOpen(false)
                                if (isCrudModalHardDismiss(reason)) {
                                  const __workspaceOnClose = closeTargetModal
                                  if (typeof __workspaceOnClose === "function") {
                                    __workspaceOnClose(reason)
                                  }
                                }
                              }}
                              workspaceFormShortcut={{
                                crudEntity: "stockSettingsModal1",
                                crudMode: targetMode,
                              }}
                              title={targetMode === "create" ? "Add Target" : "Edit Target"}
                              subtitle="Targets save automatically"
                              icon={<TargetsIcon />}
                              mode={targetMode}
                              onSave={async (...args) => {
                                const __workspaceOnSave = saveTarget
                                if (typeof __workspaceOnSave !== "function") return undefined
                                const result = await __workspaceOnSave(...args)
                                removeWorkspaceFormDraft(location.pathname, {
                                  crudEntity: "stockSettingsModal1",
                                  crudMode: targetMode,
                                })
                                return result
                              }}
                            >
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Type</InputLabel>
                      <Select
                        value={targetForm.type}
                        label="Type"
                        onChange={(e) =>
                          setTargetForm((p) => ({
                            ...p,
                            type: (e.target.value as StockTargetType) || "purchasing",
                          }))
                        }
                      >
                        <MenuItem value="purchasing">Purchasing</MenuItem>
                        <MenuItem value="stockCount">Stock Count</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>GP%</InputLabel>
                      <Select
                        value={Number(targetForm.gpPercent)}
                        label="GP%"
                        onChange={(e) =>
                          setTargetForm((p) => ({ ...p, gpPercent: Number(e.target.value) }))
                        }
                      >
                        {[...Array(21)].map((_, i) => {
                          const val = i * 5
                          return (
                            <MenuItem key={val} value={val}>
                              {val}%
                            </MenuItem>
                          )
                        })}
                      </Select>
                    </FormControl>
                  </Grid>

                  {targetForm.type === "purchasing" ? (
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Purchasing target</InputLabel>
                        <Select
                          value={Number(targetForm.purchasingMaxGBP)}
                          label="Purchasing target"
                          onChange={(e) =>
                            setTargetForm((p) => ({ ...p, purchasingMaxGBP: Number(e.target.value) }))
                          }
                        >
                          {[5000, 7500, 10000, 15000, 20000, 30000, 50000].map((v) => (
                            <MenuItem key={v} value={v}>
                              ≤ £{v.toLocaleString()}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  ) : (
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Max variance</InputLabel>
                        <Select
                          value={Number(targetForm.stockCountVarianceMaxPercent)}
                          label="Max variance"
                          onChange={(e) =>
                            setTargetForm((p) => ({
                              ...p,
                              stockCountVarianceMaxPercent: Number(e.target.value),
                            }))
                          }
                        >
                          {[0.5, 1, 2, 3, 5, 10].map((v) => (
                            <MenuItem key={v} value={v}>
                              ≤ {v}%
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  )}

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Notes (optional)"
                      value={targetForm.notes}
                      onChange={(e) => setTargetForm((p) => ({ ...p, notes: e.target.value }))}
                      placeholder='e.g. "Monthly purchasing target"'
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
                      Tip: You can create multiple targets for different GP% bands.
                    </Typography>
                  </Grid>
                </Grid>
              </CRUDModal>
            </FormSection>
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  )
}

export default StockSettings

