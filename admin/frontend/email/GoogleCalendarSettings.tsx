import React, { useState } from "react"
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
  Tooltip,
  Typography,
  FormControl,
  InputLabel,
} from "@mui/material"
import {
  CalendarMonth as CalendarIcon,
  Sync as SyncIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  LinkOff as UnlinkIcon,
} from "@mui/icons-material"
import type { GoogleCalendarConfig } from "./types"
import { DEFAULT_ACCOUNT_COLORS } from "./types"

interface GoogleCalendarSettingsProps {
  config: GoogleCalendarConfig | null
  onSave: (config: GoogleCalendarConfig) => Promise<void>
  onDelete: () => Promise<void>
  onTestConnection: (config: GoogleCalendarConfig) => Promise<{ success: boolean; message: string }>
  onSyncNow: () => Promise<void>
}

const GoogleCalendarSettings: React.FC<GoogleCalendarSettingsProps> = ({
  config,
  onSave,
  onDelete,
  onTestConnection,
  onSyncNow,
}) => {
  const [editing, setEditing] = useState(!config)
  const [form, setForm] = useState<GoogleCalendarConfig>(
    config || {
      email: "",
      appPassword: "",
      calendarId: "",
      syncEnabled: true,
      syncInterval: 15,
      color: "#4285f4",
    }
  )
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [syncing, setSyncing] = useState(false)

  const handleSave = async () => {
    if (!form.email.trim() || !form.appPassword.trim()) return
    setSaving(true)
    try {
      await onSave({ ...form, updatedAt: Date.now() })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await onTestConnection(form)
      setTestResult(result)
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || "Connection test failed" })
    } finally {
      setTesting(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      await onSyncNow()
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
        <CalendarIcon color="primary" />
        <Typography variant="h6" fontWeight={800}>
          Google Calendar Integration
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Connect your Google Calendar using an App Password. This links calendar events to the current admin account
        for scheduling, reminders, and availability tracking.
      </Typography>

      {/* Status Indicator */}
      {config && !editing && (
        <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
          <Chip
            size="small"
            label={
              config.syncStatus === "pending"
                ? "Sync Requested"
                : config.syncEnabled
                  ? "Sync Active"
                  : "Sync Paused"
            }
            color={config.syncStatus === "pending" ? "warning" : config.syncEnabled ? "success" : "default"}
            icon={<SyncIcon />}
          />
          {config.lastSyncAt && (
            <Typography variant="caption" color="text.secondary">
              Last synced: {new Date(config.lastSyncAt).toLocaleString()}
            </Typography>
          )}
          {!config.lastSyncAt && config.lastSyncRequestedAt && (
            <Typography variant="caption" color="text.secondary">
              Last sync request: {new Date(config.lastSyncRequestedAt).toLocaleString()}
            </Typography>
          )}
          <Box sx={{ flex: 1 }} />
          <Button size="small" variant="outlined" startIcon={<SyncIcon />} onClick={handleSync} disabled={syncing}>
            {syncing ? "Syncing..." : "Sync Now"}
          </Button>
        </Box>
      )}

      {/* Configuration Form */}
      {editing ? (
        <Box sx={{ display: "grid", gap: 2, maxWidth: 500 }}>
          <TextField
            size="small"
            label="Google Account Email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            fullWidth
            placeholder="your-email@gmail.com"
            helperText="The Gmail address associated with your Google Calendar."
          />
          <TextField
            size="small"
            label="App Password"
            type="password"
            value={form.appPassword}
            onChange={(e) => setForm((p) => ({ ...p, appPassword: e.target.value }))}
            fullWidth
            helperText="A 16-character app password generated from your Google Account security settings."
          />
          <TextField
            size="small"
            label="Calendar ID (optional)"
            value={form.calendarId || ""}
            onChange={(e) => setForm((p) => ({ ...p, calendarId: e.target.value }))}
            fullWidth
            placeholder="primary"
            helperText="Leave blank to use your primary calendar. Otherwise enter the Calendar ID from Google Calendar settings."
          />

          <FormControl size="small" fullWidth>
            <InputLabel>Sync Interval</InputLabel>
            <Select
              value={form.syncInterval || 15}
              label="Sync Interval"
              onChange={(e) => setForm((p) => ({ ...p, syncInterval: Number(e.target.value) }))}
            >
              <MenuItem value={5}>Every 5 minutes</MenuItem>
              <MenuItem value={15}>Every 15 minutes</MenuItem>
              <MenuItem value={30}>Every 30 minutes</MenuItem>
              <MenuItem value={60}>Every hour</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={form.syncEnabled}
                onChange={(e) => setForm((p) => ({ ...p, syncEnabled: e.target.checked }))}
              />
            }
            label="Enable automatic sync"
          />

          {/* Calendar Color */}
          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
              Calendar Color
            </Typography>
            <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
              {DEFAULT_ACCOUNT_COLORS.map((c) => (
                <Box
                  key={c}
                  onClick={() => setForm((p) => ({ ...p, color: c }))}
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    bgcolor: c,
                    cursor: "pointer",
                    border: form.color === c ? "3px solid" : "2px solid transparent",
                    borderColor: form.color === c ? "text.primary" : "transparent",
                    transition: "all 0.15s",
                    "&:hover": { transform: "scale(1.15)" },
                  }}
                />
              ))}
            </Box>
          </Box>

          {/* Test Result */}
          {testResult && (
            <Alert severity={testResult.success ? "success" : "error"} sx={{ mt: 1 }}>
              {testResult.message}
            </Alert>
          )}

          {/* Actions */}
          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", mt: 1 }}>
            <Button size="small" variant="outlined" onClick={handleTest} disabled={testing || !form.email.trim() || !form.appPassword.trim()}>
              {testing ? "Testing..." : "Test Connection"}
            </Button>
            {config && (
              <Button size="small" variant="outlined" onClick={() => { setEditing(false); setForm(config) }}>
                Cancel
              </Button>
            )}
            <Button
              size="small"
              variant="contained"
              onClick={handleSave}
              disabled={saving || !form.email.trim() || !form.appPassword.trim()}
            >
              {saving ? "Saving..." : "Save Configuration"}
            </Button>
          </Box>
        </Box>
      ) : config ? (
        <Box sx={{ display: "grid", gap: 1.5 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 1, alignItems: "center" }}>
            <Typography variant="body2" color="text.secondary" fontWeight={600}>Email:</Typography>
            <Typography variant="body2">{config.email}</Typography>

            <Typography variant="body2" color="text.secondary" fontWeight={600}>Calendar ID:</Typography>
            <Typography variant="body2">{config.calendarId || "primary"}</Typography>

            <Typography variant="body2" color="text.secondary" fontWeight={600}>Sync Interval:</Typography>
            <Typography variant="body2">{config.syncInterval || 15} minutes</Typography>

            <Typography variant="body2" color="text.secondary" fontWeight={600}>Color:</Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 20, height: 20, borderRadius: "50%", bgcolor: config.color || "#4285f4" }} />
              <Typography variant="body2">{config.color || "#4285f4"}</Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
            <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button size="small" variant="outlined" color="error" startIcon={<UnlinkIcon />} onClick={onDelete}>
              Disconnect
            </Button>
          </Box>
        </Box>
      ) : (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            No Google Calendar connected yet. Click below to set up the integration.
          </Alert>
          <Button variant="contained" startIcon={<CalendarIcon />} onClick={() => setEditing(true)}>
            Connect Google Calendar
          </Button>
        </Box>
      )}
    </Paper>
  )
}

export default GoogleCalendarSettings
