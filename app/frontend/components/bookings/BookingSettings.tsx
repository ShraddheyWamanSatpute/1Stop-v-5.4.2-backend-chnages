"use client"
import { useLocation } from "react-router-dom"

import { themeConfig } from "../../../theme/AppTheme";
import { alpha } from "@mui/material/styles";
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
  Snackbar,
  Alert,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  Badge as ProfileIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Rule as RuleIcon,
  EventBusy as BlockoutIcon,
} from "@mui/icons-material"

import { useBookings } from "../../../backend/context/BookingsContext"
import FormSection from "../reusable/FormSection"
import CRUDModal, { removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import IntegrationManager, { type Integration } from "../reusable/IntegrationManager"

const dayOptions = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

type AutoConfirmRule = {
  id: string
  enabled: boolean
  bookingTypeId?: string
  minGuests?: number
  maxGuests?: number
  daysOfWeek?: string[]
  startTime?: string
  endTime?: string
  notes?: string
  createdAt?: number
  updatedAt?: number
}

const BookingSettings: React.FC = () => {
  const location = useLocation()
  const {
    bookingSettings,
    bookingTypes,
    fetchBookingSettings,
    updateBookingSettings,
    loadBookingsIntegrations,
    saveBookingsIntegration,
    loadBookingsEmailConfig,
    saveBookingsEmailConfig,
  } = useBookings()

  const [activeTab, setActiveTab] = useState(0)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Rule modal state
  const [ruleModalOpen, setRuleModalOpen] = useState(false)
  const [ruleMode, setRuleMode] = useState<"create" | "edit">("create")
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null)
  const [ruleForm, setRuleForm] = useState<any>({
    enabled: true,
    bookingTypeId: "",
    minGuests: 1,
    maxGuests: 20,
    daysOfWeek: ["Friday", "Saturday"],
    startTime: "09:00",
    endTime: "17:00",
    notes: "",
  })

  // Blockout modal state
  const [blockoutModalOpen, setBlockoutModalOpen] = useState(false)
  const [blockoutMode, setBlockoutMode] = useState<"create" | "edit">("create")
  const [selectedBlockoutIndex, setSelectedBlockoutIndex] = useState<number | null>(null)
  const [blockoutForm, setBlockoutForm] = useState<any>({
    startDate: "",
    endDate: "",
    reason: "",
  })

  // Integration modal state
  const [integrationModalOpen, setIntegrationModalOpen] = useState(false)
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [integrationConfig, setIntegrationConfig] = useState<Record<string, any>>({})
  const [mailboxEmail, setMailboxEmail] = useState("")
  const [mailboxSenderName, setMailboxSenderName] = useState("1Stop Booking System")
  const [mailboxPassword, setMailboxPassword] = useState("")
  const [mailboxHasPassword, setMailboxHasPassword] = useState(false)
  const [mailboxUpdatedAt, setMailboxUpdatedAt] = useState<number | null>(null)
  const [mailboxSaving, setMailboxSaving] = useState(false)

  useEffect(() => {
    fetchBookingSettings().catch(() => {})
  }, [fetchBookingSettings])

  useEffect(() => {
    let cancelled = false

    const loadMailbox = async () => {
      try {
        const config = await loadBookingsEmailConfig()
        if (cancelled || !config) return
        setMailboxEmail(config.email || "")
        setMailboxSenderName(config.senderName || "1Stop Booking System")
        setMailboxHasPassword(Boolean(config.hasAppPassword))
        setMailboxUpdatedAt(typeof config.updatedAt === "number" ? config.updatedAt : null)
      } catch {
        if (!cancelled) {
          setError("Failed to load bookings mailbox settings")
        }
      }
    }

    loadMailbox()
    return () => {
      cancelled = true
    }
  }, [loadBookingsEmailConfig])

  const s = useMemo(() => {
    const val = bookingSettings || ({} as any)
    const businessHours =
      val.businessHours && Array.isArray(val.businessHours) && val.businessHours.length > 0
        ? val.businessHours
        : dayOptions.map((d) => ({
            day: d,
            closed: d === "Sunday",
            open: d === "Saturday" || d === "Sunday" ? "10:00" : "09:00",
            close: d === "Saturday" || d === "Sunday" ? "16:00" : "17:00",
          }))

    return {
      autoConfirmBookings: !!val.autoConfirmBookings,
      autoConfirmRules: (val.autoConfirmRules || []) as AutoConfirmRule[],
      businessHours,
      blackoutDates: (val.blackoutDates || []) as any[],
      bookingTypeTimeConfig: (val.bookingTypeTimeConfig || {}) as Record<string, any>,
      venueHirePricing: val.venueHirePricing || { currency: "GBP", perHour: 0, perDay: 0, notes: "" },
      publicProfile: val.publicProfile || {
        enabled: false,
        venueType: "restaurant",
        displayName: "",
        tagline: "",
        bio: "",
        address: "",
        phone: "",
        email: "",
        website: "",
        images: [],
        coverImage: "",
        amenities: [],
        social: {},
        bookingNotes: "",
      },
    }
  }, [bookingSettings])

  const save = async (updates: Record<string, any>) => {
    try {
      setSaving(true)
      setError(null)
      await updateBookingSettings(updates as any)
      setSuccess("Settings saved")
    } catch {
      setError("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  // ========= Rules CRUD =========
  const openCreateRule = () => {
    setRuleMode("create")
    setSelectedRuleId(null)
    setRuleForm({
      enabled: true,
      bookingTypeId: "",
      minGuests: 1,
      maxGuests: 20,
      daysOfWeek: ["Friday", "Saturday"],
      startTime: "09:00",
      endTime: "17:00",
      notes: "",
    })
    setRuleModalOpen(true)
  }

  const openEditRule = (rule: AutoConfirmRule) => {
    setRuleMode("edit")
    setSelectedRuleId(rule.id)
    setRuleForm({
      enabled: rule.enabled ?? true,
      bookingTypeId: rule.bookingTypeId || "",
      minGuests: rule.minGuests ?? 1,
      maxGuests: rule.maxGuests ?? 20,
      daysOfWeek: rule.daysOfWeek || [],
      startTime: rule.startTime || "09:00",
      endTime: rule.endTime || "17:00",
      notes: rule.notes || "",
    })
    setRuleModalOpen(true)
  }

  const saveRule = async () => {
    const now = Date.now()
    const id =
      ruleMode === "edit" && selectedRuleId
        ? selectedRuleId
        : `r_${now}_${Math.random().toString(16).slice(2)}`

    const nextRule: AutoConfirmRule = {
      id,
      enabled: !!ruleForm.enabled,
      bookingTypeId: ruleForm.bookingTypeId || undefined,
      minGuests: Number(ruleForm.minGuests) || 0,
      maxGuests: Number(ruleForm.maxGuests) || 0,
      daysOfWeek: Array.isArray(ruleForm.daysOfWeek) ? ruleForm.daysOfWeek : [],
      startTime: ruleForm.startTime || "",
      endTime: ruleForm.endTime || "",
      notes: ruleForm.notes || "",
      createdAt: ruleMode === "edit" ? undefined : now,
      updatedAt: now,
    }

    const existing = s.autoConfirmRules || []
    const next =
      ruleMode === "edit"
        ? existing.map((r) => (r.id === id ? { ...r, ...nextRule, createdAt: r.createdAt || now } : r))
        : [nextRule, ...existing]

    await save({ autoConfirmRules: next })
    removeWorkspaceFormDraft(location.pathname, {
      crudEntity: "bookingSettingsModal1",
      crudMode: ruleMode,
      id,
    })
    setRuleModalOpen(false)
  }

  const deleteRule = async (id: string) => {
    if (!window.confirm("Delete this rule?")) return
    await save({ autoConfirmRules: (s.autoConfirmRules || []).filter((r) => r.id !== id) })
  }

  // ========= Blockouts CRUD =========
  const openCreateBlockout = () => {
    setBlockoutMode("create")
    setSelectedBlockoutIndex(null)
    setBlockoutForm({ startDate: "", endDate: "", reason: "" })
    setBlockoutModalOpen(true)
  }

  const openEditBlockout = (idx: number) => {
    const b = s.blackoutDates[idx] || {}
    setBlockoutMode("edit")
    setSelectedBlockoutIndex(idx)
    setBlockoutForm({
      startDate: b.startDate || b.date || "",
      endDate: b.endDate || "",
      reason: b.reason || "",
    })
    setBlockoutModalOpen(true)
  }

  const saveBlockout = async () => {
    const entry = {
      startDate: blockoutForm.startDate || "",
      endDate: blockoutForm.endDate || "",
      reason: blockoutForm.reason || "",
    }
    const next = [...(s.blackoutDates || [])]
    if (blockoutMode === "edit" && selectedBlockoutIndex !== null) {
      next[selectedBlockoutIndex] = entry
    } else {
      next.unshift(entry)
    }
    await save({ blackoutDates: next })
    removeWorkspaceFormDraft(location.pathname, {
      crudEntity: "bookingSettingsModal2",
      crudMode: blockoutMode,
      id:
        blockoutMode === "edit" && selectedBlockoutIndex !== null ? String(selectedBlockoutIndex) : undefined,
    })
    setBlockoutModalOpen(false)
  }

  const deleteBlockout = async (idx: number) => {
    if (!window.confirm("Delete this blockout?")) return
    const next = [...(s.blackoutDates || [])]
    next.splice(idx, 1)
    await save({ blackoutDates: next })
  }

  // ========= Integrations =========
  const availableIntegrations: Integration[] = useMemo(
    () => [
      {
        id: "google-calendar",
        name: "Google Calendar",
        description: "Sync bookings with Google Calendar",
        icon: "📅",
        enabled: false,
      },
      {
        id: "outlook-calendar",
        name: "Outlook Calendar",
        description: "Sync bookings with Outlook Calendar",
        icon: "📆",
        enabled: false,
      },
      {
        id: "opentable",
        name: "OpenTable",
        description: "Sync with OpenTable reservation system",
        icon: "🍽️",
        enabled: false,
      },
      {
        id: "resy",
        name: "Resy",
        description: "Sync with Resy reservation system",
        icon: "🍴",
        enabled: false,
      },
    ],
    [],
  )

  const loadIntegrationsOverride = useCallback(async () => {
    return await loadBookingsIntegrations()
  }, [loadBookingsIntegrations])

  const saveIntegrationOverride = useCallback(
    async (integration: Integration) => {
      await saveBookingsIntegration(integration as any)
    },
    [saveBookingsIntegration],
  )

  const openIntegrationModal = (integration: Integration) => {
    setSelectedIntegration(integration)
    setIntegrationConfig(integration.config || {})
    setIntegrationModalOpen(true)
  }

  const saveIntegrationConfig = async () => {
    if (!selectedIntegration) return
    await saveBookingsIntegration({
      ...selectedIntegration,
      config: integrationConfig,
      updatedAt: Date.now(),
    } as any)
    removeWorkspaceFormDraft(location.pathname, {
      crudEntity: "bookingSettingsModal3",
      crudMode: "edit",
      id: selectedIntegration?.id,
      itemLabel: selectedIntegration?.name,
    })
    setIntegrationModalOpen(false)
    setSuccess("Integration saved")
  }

  const saveMailbox = async () => {
    if (!mailboxEmail.trim()) {
      setError("Mailbox email is required")
      return
    }
    if (!mailboxPassword.trim() && !mailboxHasPassword) {
      setError("App password is required for the first secure save")
      return
    }

    try {
      setMailboxSaving(true)
      setError(null)
      await saveBookingsEmailConfig({
        email: mailboxEmail.trim(),
        senderName: mailboxSenderName.trim() || "1Stop Booking System",
        appPassword: mailboxPassword.trim() || undefined,
      })
      const refreshed = await loadBookingsEmailConfig()
      setMailboxHasPassword(Boolean(refreshed?.hasAppPassword))
      setMailboxUpdatedAt(typeof refreshed?.updatedAt === "number" ? refreshed.updatedAt : Date.now())
      setMailboxSenderName(refreshed?.senderName || mailboxSenderName.trim() || "1Stop Booking System")
      setMailboxEmail(refreshed?.email || mailboxEmail.trim())
      setMailboxPassword("")
      setSuccess("Bookings mailbox saved securely")
    } catch {
      setError("Failed to save bookings mailbox")
    } finally {
      setMailboxSaving(false)
    }
  }

  // ========= Profile =========
  const addProfileImage = async (url: string) => {
    const clean = url.trim()
    if (!clean) return
    const images = [...(s.publicProfile.images || [])]
    images.unshift(clean)
    await save({ publicProfile: { ...s.publicProfile, images } })
  }

  const removeProfileImage = async (idx: number) => {
    const images = [...(s.publicProfile.images || [])]
    images.splice(idx, 1)
    await save({ publicProfile: { ...s.publicProfile, images } })
  }

  return (
    <Box sx={{ width: "100%", pt: 2 }}>
      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="error" onClose={() => setError(null)}>
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
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto">
            <Tab label="General" icon={<SettingsIcon />} iconPosition="start" />
            <Tab label="Integrations" icon={<IntegrationIcon />} iconPosition="start" />
            <Tab label="Profile" icon={<ProfileIcon />} iconPosition="start" />
          </Tabs>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={() => save({})} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </Box>

        {/* General */}
        {activeTab === 0 && (
          <Box sx={{ py: 3, px: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormSection title="Auto-confirm bookings" subtitle="Automatically confirm bookings based on rules.">
                  <FormControlLabel
                    control={
                      <Switch
                        checked={s.autoConfirmBookings}
                        onChange={(e) => save({ autoConfirmBookings: e.target.checked })}
                      />
                    }
                    label="Allow auto-confirmed bookings"
                    sx={{ display: "block", mb: 2 }}
                  />

                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`${s.autoConfirmRules.length} rule${s.autoConfirmRules.length === 1 ? "" : "s"}`}
                    />
                    <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openCreateRule}>
                      Add rule
                    </Button>
                  </Box>

                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Rule</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {s.autoConfirmRules.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3}>
                              <Typography variant="body2" color="text.secondary">
                                No rules yet. Add one to control auto-confirm behaviour.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          s.autoConfirmRules.map((r) => {
                            const btName = bookingTypes?.find((t: any) => t.id === r.bookingTypeId)?.name
                            const label = `${btName || "Any type"} · ${
                              r.minGuests ?? 1
                            }-${r.maxGuests ?? "∞"} guests · ${(r.daysOfWeek || []).join(", ") || "Any day"} · ${
                              r.startTime || "--"
                            }-${r.endTime || "--"}`
                            return (
                              <TableRow key={r.id} hover>
                                <TableCell>
                                  <Typography variant="body2" noWrap title={label}>
                                    {label}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    size="small"
                                    variant="outlined"
                                    label={r.enabled ? "Enabled" : "Disabled"}
                                    color={r.enabled ? "success" : "default"}
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <Tooltip title="Edit">
                                    <IconButton size="small" onClick={() => openEditRule(r)}>
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete">
                                    <IconButton size="small" color="error" onClick={() => deleteRule(r.id)}>
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
                </FormSection>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormSection title="Opening days & times" subtitle="When bookings are accepted.">
                  <Grid container spacing={1}>
                    {s.businessHours.map((d: any, idx: number) => (
                      <Grid item xs={12} key={`${d.day}-${idx}`}>
                        <Box sx={{ display: "flex", gap: 1, alignItems: "center", justifyContent: "space-between" }}>
                          <Typography sx={{ minWidth: 110, fontWeight: 600 }}>{d.day}</Typography>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={!d.closed}
                                onChange={(e) => {
                                  const next = [...s.businessHours]
                                  next[idx] = { ...next[idx], closed: !e.target.checked }
                                  save({ businessHours: next })
                                }}
                              />
                            }
                            label={d.closed ? "Closed" : "Open"}
                            sx={{ m: 0 }}
                          />
                          <TextField
                            type="time"
                            size="small"
                            value={d.open}
                            disabled={d.closed}
                            onChange={(e) => {
                              const next = [...s.businessHours]
                              next[idx] = { ...next[idx], open: e.target.value }
                              save({ businessHours: next })
                            }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            to
                          </Typography>
                          <TextField
                            type="time"
                            size="small"
                            value={d.close}
                            disabled={d.closed}
                            onChange={(e) => {
                              const next = [...s.businessHours]
                              next[idx] = { ...next[idx], close: e.target.value }
                              save({ businessHours: next })
                            }}
                          />
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </FormSection>
              </Grid>

              <Grid item xs={12}>
                <FormSection title="Booking times by booking type" subtitle="Override duration and time slot interval per type.">
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Type</TableCell>
                          <TableCell>Duration (min)</TableCell>
                          <TableCell>Slot interval (min)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(bookingTypes || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3}>No booking types found.</TableCell>
                          </TableRow>
                        ) : (
                          (bookingTypes || []).map((t: any) => {
                            const cfg = s.bookingTypeTimeConfig[t.id] || {}
                            return (
                              <TableRow key={t.id} hover>
                                <TableCell>{t.name}</TableCell>
                                <TableCell>
                                  <TextField
                                    type="number"
                                    size="small"
                                    value={cfg.durationMinutes ?? t.defaultDuration ?? 120}
                                    onChange={(e) => {
                                      const v = parseInt(e.target.value) || 0
                                      save({
                                        bookingTypeTimeConfig: {
                                          ...s.bookingTypeTimeConfig,
                                          [t.id]: { ...cfg, durationMinutes: v },
                                        },
                                      })
                                    }}
                                    inputProps={{ min: 0, max: 600 }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    type="number"
                                    size="small"
                                    value={cfg.slotIntervalMinutes ?? bookingSettings?.timeSlotInterval ?? 30}
                                    onChange={(e) => {
                                      const v = parseInt(e.target.value) || 0
                                      save({
                                        bookingTypeTimeConfig: {
                                          ...s.bookingTypeTimeConfig,
                                          [t.id]: { ...cfg, slotIntervalMinutes: v },
                                        },
                                      })
                                    }}
                                    inputProps={{ min: 5, max: 120 }}
                                  />
                                </TableCell>
                              </TableRow>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </FormSection>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormSection title="Block out bookings" subtitle="Prevent bookings on specific dates or date ranges.">
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`${s.blackoutDates.length} blockout${s.blackoutDates.length === 1 ? "" : "s"}`}
                    />
                    <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openCreateBlockout}>
                      Add blockout
                    </Button>
                  </Box>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Date(s)</TableCell>
                          <TableCell>Reason</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {s.blackoutDates.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3}>
                              <Typography variant="body2" color="text.secondary">
                                No blockouts configured.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          s.blackoutDates.map((b: any, idx: number) => {
                            const from = b.startDate || b.date || ""
                            const to = b.endDate || ""
                            const label = to ? `${from} → ${to}` : from
                            return (
                              <TableRow key={`${label}-${idx}`} hover>
                                <TableCell>{label || "—"}</TableCell>
                                <TableCell sx={{ maxWidth: 260 }}>
                                  <Typography noWrap title={b.reason || ""}>
                                    {b.reason || "—"}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Tooltip title="Edit">
                                    <IconButton size="small" onClick={() => openEditBlockout(idx)}>
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete">
                                    <IconButton size="small" color="error" onClick={() => deleteBlockout(idx)}>
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
                </FormSection>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormSection title="Venue hire pricing" subtitle="Optional pricing for venue hire bookings.">
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Currency"
                        value={s.venueHirePricing.currency || "GBP"}
                        onChange={(e) => save({ venueHirePricing: { ...s.venueHirePricing, currency: e.target.value } })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Per hour"
                        value={s.venueHirePricing.perHour || 0}
                        onChange={(e) =>
                          save({ venueHirePricing: { ...s.venueHirePricing, perHour: Number(e.target.value) || 0 } })
                        }
                        InputProps={{ startAdornment: <Typography sx={{ mr: 1 }}>£</Typography> }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Per day"
                        value={s.venueHirePricing.perDay || 0}
                        onChange={(e) =>
                          save({ venueHirePricing: { ...s.venueHirePricing, perDay: Number(e.target.value) || 0 } })
                        }
                        InputProps={{ startAdornment: <Typography sx={{ mr: 1 }}>£</Typography> }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Notes"
                        value={s.venueHirePricing.notes || ""}
                        onChange={(e) => save({ venueHirePricing: { ...s.venueHirePricing, notes: e.target.value } })}
                      />
                    </Grid>
                  </Grid>
                </FormSection>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Integrations */}
        {activeTab === 1 && (
          <Box sx={{ py: 3, px: 2 }}>
            <FormSection
              title="Bookings Mailbox"
              subtitle="Store the sender mailbox password securely on the server for booking emails and preorder links."
            >
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Mailbox Email"
                    value={mailboxEmail}
                    onChange={(e) => setMailboxEmail(e.target.value)}
                    placeholder="bookings@yourvenue.com"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Sender Name"
                    value={mailboxSenderName}
                    onChange={(e) => setMailboxSenderName(e.target.value)}
                    placeholder="1Stop Booking System"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="password"
                    label={mailboxHasPassword ? "Replace App Password" : "App Password"}
                    value={mailboxPassword}
                    onChange={(e) => setMailboxPassword(e.target.value)}
                    helperText={
                      mailboxHasPassword
                        ? "Leave blank to keep the current stored password."
                        : "Required for the first secure save."
                    }
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                    <Typography variant="caption" color="text.secondary">
                      {mailboxHasPassword ? "Server-side password stored." : "No server-side password stored yet."}
                      {mailboxUpdatedAt ? ` Last updated: ${new Date(mailboxUpdatedAt).toLocaleString()}` : ""}
                    </Typography>
                    <Button variant="outlined" onClick={saveMailbox} disabled={mailboxSaving}>
                      {mailboxSaving ? "Saving..." : "Save Mailbox Securely"}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </FormSection>

            <FormSection title="Integrations" subtitle="Click an integration to open setup. Changes save automatically.">
              <IntegrationManager
                module="bookings"
                layout="compact"
                hideConfigureButton={true}
                loadIntegrationsOverride={loadIntegrationsOverride}
                saveIntegrationOverride={saveIntegrationOverride}
                onIntegrationClick={(integration) => openIntegrationModal(integration)}
                availableIntegrations={availableIntegrations}
              />
            </FormSection>
          </Box>
        )}

        {/* Profile */}
        {activeTab === 2 && (
          <Box sx={{ py: 3, px: 2 }}>
            <FormSection title="Public booking profile" subtitle="What customers see when booking your venue.">
              <FormControlLabel
                control={
                  <Switch
                    checked={!!s.publicProfile.enabled}
                    onChange={(e) => save({ publicProfile: { ...s.publicProfile, enabled: e.target.checked } })}
                  />
                }
                label="Enable public profile"
                sx={{ display: "block", mb: 2 }}
              />

              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Venue type</InputLabel>
                    <Select
                      value={s.publicProfile.venueType || "restaurant"}
                      label="Venue type"
                      onChange={(e) => save({ publicProfile: { ...s.publicProfile, venueType: e.target.value } })}
                    >
                      <MenuItem value="restaurant">Restaurant</MenuItem>
                      <MenuItem value="pub">Pub</MenuItem>
                      <MenuItem value="cafe">Cafe</MenuItem>
                      <MenuItem value="hotel">Hotel</MenuItem>
                      <MenuItem value="venue">Venue</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    label="Display name"
                    value={s.publicProfile.displayName || ""}
                    onChange={(e) => save({ publicProfile: { ...s.publicProfile, displayName: e.target.value } })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Tagline"
                    value={s.publicProfile.tagline || ""}
                    onChange={(e) => save({ publicProfile: { ...s.publicProfile, tagline: e.target.value } })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Bio"
                    multiline
                    minRows={4}
                    value={s.publicProfile.bio || ""}
                    onChange={(e) => save({ publicProfile: { ...s.publicProfile, bio: e.target.value } })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Address"
                    value={s.publicProfile.address || ""}
                    onChange={(e) => save({ publicProfile: { ...s.publicProfile, address: e.target.value } })}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Phone"
                    value={s.publicProfile.phone || ""}
                    onChange={(e) => save({ publicProfile: { ...s.publicProfile, phone: e.target.value } })}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Email"
                    value={s.publicProfile.email || ""}
                    onChange={(e) => save({ publicProfile: { ...s.publicProfile, email: e.target.value } })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Website"
                    value={s.publicProfile.website || ""}
                    onChange={(e) => save({ publicProfile: { ...s.publicProfile, website: e.target.value } })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Booking notes"
                    value={s.publicProfile.bookingNotes || ""}
                    onChange={(e) => save({ publicProfile: { ...s.publicProfile, bookingNotes: e.target.value } })}
                    placeholder="e.g. Please arrive 10 minutes early. Deposits may apply for large parties."
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    Images
                  </Typography>
                  <TextField
                    fullWidth
                    label="Add image URL and press Enter"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        const input = e.currentTarget as HTMLInputElement
                        addProfileImage(input.value).then(() => {
                          input.value = ""
                        })
                      }
                    }}
                    sx={{ mb: 2 }}
                  />

                  {(s.publicProfile.images || []).length === 0 ? (
                    <Alert severity="info">No images yet. Add a few to make the profile look great.</Alert>
                  ) : (
                    <Grid container spacing={1}>
                      {(s.publicProfile.images || []).map((url: string, idx: number) => (
                        <Grid item xs={12} md={6} key={`${url}-${idx}`}>
                          <Paper variant="outlined" sx={{ p: 1, display: "flex", gap: 1, alignItems: "center" }}>
                            <Box sx={{ width: 64, height: 48, borderRadius: 1, bgcolor: alpha(themeConfig.brandColors.navy, 0.04), overflow: "hidden" }}>
                              <img src={url} alt="venue" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </Box>
                            <Typography variant="body2" sx={{ flex: 1 }} noWrap title={url}>
                              {url}
                            </Typography>
                            <IconButton size="small" color="error" onClick={() => removeProfileImage(idx)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </Grid>
              </Grid>
            </FormSection>
          </Box>
        )}
      </Paper>

      {/* Auto-confirm rule modal */}
      <CRUDModal
        open={ruleModalOpen}
        onClose={() => setRuleModalOpen(false)}
        workspaceFormShortcut={{
          crudEntity: "bookingSettingsModal1",
          crudMode: ruleMode,
          id: selectedRuleId ?? undefined,
        }}
        title="Auto-confirm rule"
        mode={ruleMode === "edit" ? "edit" : "create"}
        onSave={saveRule}
      >
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch checked={!!ruleForm.enabled} onChange={(e) => setRuleForm((p: any) => ({ ...p, enabled: e.target.checked }))} />}
              label="Enabled"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Booking type</InputLabel>
              <Select
                value={ruleForm.bookingTypeId}
                label="Booking type"
                onChange={(e) => setRuleForm((p: any) => ({ ...p, bookingTypeId: e.target.value }))}
              >
                <MenuItem value="">
                  <em>Any</em>
                </MenuItem>
                {(bookingTypes || []).map((t: any) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={3}>
            <TextField
              fullWidth
              type="number"
              label="Min guests"
              value={ruleForm.minGuests}
              onChange={(e) => setRuleForm((p: any) => ({ ...p, minGuests: parseInt(e.target.value) || 0 }))}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <TextField
              fullWidth
              type="number"
              label="Max guests"
              value={ruleForm.maxGuests}
              onChange={(e) => setRuleForm((p: any) => ({ ...p, maxGuests: parseInt(e.target.value) || 0 }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Days of week</InputLabel>
              <Select
                multiple
                value={ruleForm.daysOfWeek}
                label="Days of week"
                onChange={(e) => setRuleForm((p: any) => ({ ...p, daysOfWeek: e.target.value }))}
                renderValue={(selected) => (selected as string[]).join(", ")}
              >
                {dayOptions.map((d) => (
                  <MenuItem key={d} value={d}>
                    {d}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={3}>
            <TextField
              fullWidth
              type="time"
              label="Start time"
              value={ruleForm.startTime}
              onChange={(e) => setRuleForm((p: any) => ({ ...p, startTime: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <TextField
              fullWidth
              type="time"
              label="End time"
              value={ruleForm.endTime}
              onChange={(e) => setRuleForm((p: any) => ({ ...p, endTime: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Notes"
              value={ruleForm.notes}
              onChange={(e) => setRuleForm((p: any) => ({ ...p, notes: e.target.value }))}
            />
          </Grid>
        </Grid>
      </CRUDModal>

      {/* Blockout modal */}
      <CRUDModal
        open={blockoutModalOpen}
        onClose={() => setBlockoutModalOpen(false)}
        workspaceFormShortcut={{
          crudEntity: "bookingSettingsModal2",
          crudMode: blockoutMode,
          id:
            blockoutMode === "edit" && selectedBlockoutIndex !== null ? String(selectedBlockoutIndex) : undefined,
        }}
        title={blockoutMode === "create" ? "Add blockout" : "Edit blockout"}
        mode="edit"
        onSave={saveBlockout}
      >
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="date"
              label="Start date"
              value={blockoutForm.startDate}
              onChange={(e) => setBlockoutForm((p: any) => ({ ...p, startDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="date"
              label="End date (optional)"
              value={blockoutForm.endDate}
              onChange={(e) => setBlockoutForm((p: any) => ({ ...p, endDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Reason"
              value={blockoutForm.reason}
              onChange={(e) => setBlockoutForm((p: any) => ({ ...p, reason: e.target.value }))}
            />
          </Grid>
        </Grid>
      </CRUDModal>

      {/* Integration modal */}
      <CRUDModal
        open={integrationModalOpen}
        onClose={() => setIntegrationModalOpen(false)}
        workspaceFormShortcut={{
          crudEntity: "bookingSettingsModal3",
          crudMode: "edit",
          id: selectedIntegration?.id,
          itemLabel: selectedIntegration?.name,
        }}
        title={selectedIntegration?.name || "Integration"}
        subtitle="Configure and save integration settings"
        icon={<IntegrationIcon />}
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
                onChange={(e) =>
                  setIntegrationConfig((p) => ({ ...p, clientId: e.target.value, apiKey: e.target.value }))
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Client Secret / API Secret"
                type="password"
                value={integrationConfig.clientSecret || integrationConfig.apiSecret || ""}
                onChange={(e) =>
                  setIntegrationConfig((p) => ({ ...p, clientSecret: e.target.value, apiSecret: e.target.value }))
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Redirect URL / Endpoint"
                value={integrationConfig.redirectUri || integrationConfig.endpointUrl || ""}
                onChange={(e) =>
                  setIntegrationConfig((p) => ({
                    ...p,
                    redirectUri: e.target.value,
                    endpointUrl: e.target.value,
                  }))
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                value={integrationConfig.notes || ""}
                onChange={(e) => setIntegrationConfig((p) => ({ ...p, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        )}
      </CRUDModal>
    </Box>
  )
}

export default BookingSettings

