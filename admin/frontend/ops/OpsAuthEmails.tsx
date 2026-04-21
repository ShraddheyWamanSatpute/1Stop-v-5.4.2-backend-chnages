import React from "react"
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material"
import { authedFetch } from "./opsApi"

type AuthEmailTemplateKey = "verifyEmail" | "passwordReset" | "magicLink"

type AuthEmailSettings = {
  defaultContinueUrl?: string
  appName?: string
  supportEmail?: string
}

type AuthEmailTemplate = {
  key: AuthEmailTemplateKey
  enabled: boolean
  subject: string
  html: string
  text?: string
}

type AuthEmailSenderProvider = "gmailAppPassword" | "smtp"

type AuthEmailSenderPublic = {
  provider: AuthEmailSenderProvider
  email?: string
  senderName?: string
  appPasswordSet?: boolean
}

function templateLabel(k: AuthEmailTemplateKey): string {
  if (k === "verifyEmail") return "Verify email"
  if (k === "passwordReset") return "Password reset"
  return "Magic link"
}

export default function OpsAuthEmails() {
  const [loading, setLoading] = React.useState(true)
  const [working, setWorking] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [ok, setOk] = React.useState<string | null>(null)

  const [settings, setSettings] = React.useState<AuthEmailSettings>({})
  const [sender, setSender] = React.useState<AuthEmailSenderPublic>({
    provider: "gmailAppPassword",
    email: "",
    senderName: "",
    appPasswordSet: false,
  })
  const [senderAppPassword, setSenderAppPassword] = React.useState("")
  const [templates, setTemplates] = React.useState<Record<AuthEmailTemplateKey, AuthEmailTemplate> | null>(null)
  const [selected, setSelected] = React.useState<AuthEmailTemplateKey>("verifyEmail")

  const [testEmail, setTestEmail] = React.useState("")
  const [testContinueUrl, setTestContinueUrl] = React.useState("")
  const [subTab, setSubTab] = React.useState(0)

  const refresh = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    setOk(null)
    try {
      const r = (await authedFetch("/authEmails/templates", { method: "GET" })) as any
      setSettings(r?.settings || {})
      setSender((prev) => ({ ...prev, ...(r?.sender || {}) }))
      setTemplates(r?.templates || null)
      setTestContinueUrl((cur) => cur || String(r?.settings?.defaultContinueUrl || ""))
    } catch (e: any) {
      setError(e?.message || "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    refresh()
  }, [refresh])

  const active = templates?.[selected] || null

  const saveSettings = async () => {
    setWorking(true)
    setError(null)
    setOk(null)
    try {
      const r = (await authedFetch("/authEmails/settings", {
        method: "POST",
        body: JSON.stringify({
          defaultContinueUrl: settings.defaultContinueUrl || "",
          appName: settings.appName || "",
          supportEmail: settings.supportEmail || "",
        }),
      })) as any
      setSettings(r?.settings || settings)
      setOk("Settings saved.")
      await refresh()
    } catch (e: any) {
      setError(e?.message || "Failed to save settings")
    } finally {
      setWorking(false)
    }
  }

  const saveTemplate = async () => {
    if (!active) return
    setWorking(true)
    setError(null)
    setOk(null)
    try {
      const r = (await authedFetch("/authEmails/templates/upsert", {
        method: "POST",
        body: JSON.stringify({
          key: active.key,
          enabled: Boolean(active.enabled),
          subject: active.subject || "",
          html: active.html || "",
          text: active.text || "",
        }),
      })) as any
      setTemplates(r?.templates || templates)
      setOk("Template saved.")
    } catch (e: any) {
      setError(e?.message || "Failed to save template")
    } finally {
      setWorking(false)
    }
  }

  const saveSender = async () => {
    setWorking(true)
    setError(null)
    setOk(null)
    try {
      const r = (await authedFetch("/authEmails/sender", {
        method: "POST",
        body: JSON.stringify({
          provider: sender.provider,
          email: sender.email || "",
          senderName: sender.senderName || "",
          // only send if user entered a value (keeps existing password otherwise)
          appPassword: senderAppPassword ? senderAppPassword : "",
        }),
      })) as any
      setSender(r?.sender || sender)
      setSenderAppPassword("")
      setOk("Sender saved.")
      await refresh()
    } catch (e: any) {
      setError(e?.message || "Failed to save sender")
    } finally {
      setWorking(false)
    }
  }

  const sendTest = async () => {
    setWorking(true)
    setError(null)
    setOk(null)
    try {
      const r = (await authedFetch("/authEmails/send", {
        method: "POST",
        body: JSON.stringify({
          type: selected,
          email: testEmail,
          continueUrl: testContinueUrl || settings.defaultContinueUrl || "",
        }),
      })) as any
      setOk(`Sent. ${r?.messageId ? `Message ID: ${r.messageId}` : ""}`.trim())
    } catch (e: any) {
      setError(e?.message || "Failed to send")
    } finally {
      setWorking(false)
    }
  }

  const updateActive = (patch: Partial<AuthEmailTemplate>) => {
    if (!templates || !active) return
    setTemplates({ ...templates, [selected]: { ...active, ...patch } as AuthEmailTemplate })
  }

  return (
    <Box>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2} alignItems={{ xs: "stretch", md: "center" }} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={900}>
            Auth Emails
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Custom Firebase Auth email templates and sender configuration.
          </Typography>
        </Box>
        <Stack direction="row" gap={1} alignItems="center" justifyContent="flex-end" flexWrap="wrap">
          <Button variant="outlined" onClick={refresh} disabled={loading || working}>
            Refresh
          </Button>
        </Stack>
      </Stack>

      {error ? (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          </CardContent>
        </Card>
      ) : null}

      {ok ? (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="body2">{ok}</Typography>
          </CardContent>
        </Card>
      ) : null}

      <Tabs
        value={subTab}
        onChange={(_e, v) => setSubTab(v)}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label="Settings" />
        <Tab label="Sender" />
        <Tab label="Templates" />
        <Tab label="Test send" />
      </Tabs>

      {subTab === 0 ? (
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography fontWeight={900} sx={{ mb: 1 }}>
            Settings
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} gap={1.5} sx={{ mb: 1.5 }}>
            <TextField
              size="small"
              fullWidth
              label="App name"
              value={settings.appName || ""}
              onChange={(e) => setSettings((p) => ({ ...p, appName: e.target.value }))}
              placeholder="1Stop"
            />
            <TextField
              size="small"
              fullWidth
              label="Support email (optional)"
              value={settings.supportEmail || ""}
              onChange={(e) => setSettings((p) => ({ ...p, supportEmail: e.target.value }))}
              placeholder="support@yourdomain.com"
            />
          </Stack>
          <TextField
            size="small"
            fullWidth
            label="Default continue URL (required for generating links)"
            value={settings.defaultContinueUrl || ""}
            onChange={(e) => setSettings((p) => ({ ...p, defaultContinueUrl: e.target.value }))}
            placeholder="https://your-site.web.app"
            sx={{ mb: 1.5 }}
          />
          <Button variant="contained" onClick={saveSettings} disabled={loading || working}>
            Save settings
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            Note: the continue URL’s domain must be allowed in Firebase Auth “Authorized domains”.
          </Typography>
        </CardContent>
      </Card>
      ) : null}

      {subTab === 1 ? (
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography fontWeight={900} sx={{ mb: 1 }}>
            Sender (Gmail App Password)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Emails are sent using a Gmail account with an app password. This is stored server-side and never shown back in the UI.
          </Typography>

          <Stack direction={{ xs: "column", md: "row" }} gap={1.5} sx={{ mb: 1.5 }} alignItems={{ xs: "stretch", md: "center" }}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Provider</InputLabel>
              <Select
                label="Provider"
                value={sender.provider}
                onChange={(e) => setSender((p) => ({ ...p, provider: e.target.value as AuthEmailSenderProvider }))}
                disabled={loading || working}
              >
                <MenuItem value="gmailAppPassword">Gmail App Password</MenuItem>
                <MenuItem value="smtp">SMTP env (fallback)</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small"
              fullWidth
              label="Sender name (optional)"
              value={sender.senderName || ""}
              onChange={(e) => setSender((p) => ({ ...p, senderName: e.target.value }))}
              disabled={loading || working}
              placeholder={settings.appName || "1Stop"}
            />
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} gap={1.5} sx={{ mb: 1.5 }}>
            <TextField
              size="small"
              fullWidth
              label="Sender Gmail address"
              value={sender.email || ""}
              onChange={(e) => setSender((p) => ({ ...p, email: e.target.value }))}
              disabled={loading || working}
              placeholder="no-reply@yourdomain.com"
            />
            <TextField
              size="small"
              fullWidth
              type="password"
              label={sender.appPasswordSet ? "App password (leave blank to keep existing)" : "App password"}
              value={senderAppPassword}
              onChange={(e) => setSenderAppPassword(e.target.value)}
              disabled={loading || working}
              placeholder={sender.appPasswordSet ? "••••••••••••••••" : ""}
            />
          </Stack>

          <Button variant="contained" onClick={saveSender} disabled={loading || working}>
            Save sender
          </Button>
        </CardContent>
      </Card>
      ) : null}

      {subTab === 2 ? (
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography fontWeight={900} sx={{ mb: 1 }}>
            Templates
          </Typography>

          <Stack direction={{ xs: "column", md: "row" }} gap={1.5} sx={{ mb: 1.5 }} alignItems={{ xs: "stretch", md: "center" }}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Template</InputLabel>
              <Select label="Template" value={selected} onChange={(e) => setSelected(e.target.value as AuthEmailTemplateKey)} disabled={loading || working}>
                <MenuItem value="verifyEmail">{templateLabel("verifyEmail")}</MenuItem>
                <MenuItem value="passwordReset">{templateLabel("passwordReset")}</MenuItem>
                <MenuItem value="magicLink">{templateLabel("magicLink")}</MenuItem>
              </Select>
            </FormControl>

            <Stack direction="row" gap={1} alignItems="center" sx={{ flexGrow: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Enabled
              </Typography>
              <Switch checked={Boolean(active?.enabled)} onChange={(_e, v) => updateActive({ enabled: v })} disabled={loading || working || !active} />
            </Stack>
          </Stack>

          <TextField
            size="small"
            fullWidth
            label="Subject"
            value={active?.subject || ""}
            onChange={(e) => updateActive({ subject: e.target.value })}
            disabled={loading || working || !active}
            sx={{ mb: 1.5 }}
          />
          <TextField
            size="small"
            fullWidth
            multiline
            minRows={8}
            label="HTML body"
            value={active?.html || ""}
            onChange={(e) => updateActive({ html: e.target.value })}
            disabled={loading || working || !active}
            sx={{ mb: 1.5 }}
          />
          <TextField
            size="small"
            fullWidth
            multiline
            minRows={6}
            label="Text body (optional)"
            value={active?.text || ""}
            onChange={(e) => updateActive({ text: e.target.value })}
            disabled={loading || working || !active}
            sx={{ mb: 1.5 }}
          />

          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
            Available variables: <code>{"{{actionLink}}"}</code>, <code>{"{{email}}"}</code>, <code>{"{{continueUrl}}"}</code>, <code>{"{{appName}}"}</code>,{" "}
            <code>{"{{supportEmail}}"}</code>
          </Typography>

          <Button variant="contained" onClick={saveTemplate} disabled={loading || working || !active}>
            Save template
          </Button>
        </CardContent>
      </Card>
      ) : null}

      {subTab === 3 ? (
      <Card variant="outlined">
        <CardContent>
          <Typography fontWeight={900} sx={{ mb: 1 }}>
            Send test email
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            The email type matches the template selected on the <strong>Templates</strong> tab ({templateLabel(selected)}).
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} gap={1.5} sx={{ mb: 1.5 }}>
            <TextField
              size="small"
              fullWidth
              label="Recipient email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="user@example.com"
            />
            <TextField
              size="small"
              fullWidth
              label="Continue URL (optional override)"
              value={testContinueUrl}
              onChange={(e) => setTestContinueUrl(e.target.value)}
              placeholder={String(settings.defaultContinueUrl || "")}
            />
          </Stack>
          <Divider sx={{ mb: 1.5 }} />
          <Button variant="contained" onClick={sendTest} disabled={loading || working || !testEmail.trim()}>
            Send {templateLabel(selected)}
          </Button>
        </CardContent>
      </Card>
      ) : null}
    </Box>
  )
}
