import React, { useEffect, useMemo, useState } from "react"
import {
  Alert,
  Box,
  Button,
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
  Add as AddIcon,
  Settings as SettingsIcon,
  Share as PlatformsIcon,
  Key as CredentialsIcon,
  Save as SaveIcon,
  Edit as EditIcon,
} from "@mui/icons-material"
import { useAdmin } from "../../backend/context/AdminContext"
import type { PlatformSettings } from "../../backend/interfaces/Content"
import { db, onValue, push, ref, set, update } from "../../backend/services/Firebase"

type MarketingDefaults = {
  utmSource: string
  utmMedium: string
  utmCampaignPrefix: string
  defaultCurrency: string
}

const DEFAULTS_PATH = "admin/marketing/settings"

const PLATFORMS: Array<PlatformSettings["platform"]> = ["instagram", "facebook", "linkedin", "twitter", "google_ads"]

type SocialPlatform = "twitter" | "instagram" | "facebook" | "linkedin"
type SocialAccount = {
  id: string
  platform: SocialPlatform
  displayName: string
  connected: boolean
  createdAt: number
  updatedAt: number
}

const SOCIAL_PLATFORMS: SocialPlatform[] = ["twitter", "instagram", "facebook", "linkedin"]

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index, ...other } = props
  return (
    <div role="tabpanel" hidden={value !== index} id={`marketing-settings-tabpanel-${index}`} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

export default function MarketingSettings() {
  const {
    platformSettings,
    fetchPlatformSettings,
    createPlatformSettings,
    updatePlatformSettings,
  } = useAdmin()

  const [activeTab, setActiveTab] = useState(0)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [defaults, setDefaults] = useState<MarketingDefaults>({
    utmSource: "1stop",
    utmMedium: "marketing",
    utmCampaignPrefix: "crm",
    defaultCurrency: "GBP",
  })

  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([])
  const [socialCredentials, setSocialCredentials] = useState<any>({
    twitter: { accessToken: "" },
    facebook: { pageId: "", pageAccessToken: "" },
    linkedin: { authorUrn: "", accessToken: "" },
    instagram: { igUserId: "", accessToken: "" },
  })

  const socialCredentialReady = useMemo(() => {
    return {
      twitter: Boolean(String(socialCredentials?.twitter?.accessToken || "").trim()),
      facebook: Boolean(String(socialCredentials?.facebook?.pageId || "").trim() && String(socialCredentials?.facebook?.pageAccessToken || "").trim()),
      linkedin: Boolean(String(socialCredentials?.linkedin?.authorUrn || "").trim() && String(socialCredentials?.linkedin?.accessToken || "").trim()),
      instagram: Boolean(String(socialCredentials?.instagram?.igUserId || "").trim() && (String(socialCredentials?.instagram?.accessToken || "").trim() || String(socialCredentials?.facebook?.pageAccessToken || "").trim())),
    } as const
  }, [socialCredentials])

  // Marketing defaults (simple key/value settings)
  useEffect(() => {
    const settingsRef = ref(db, DEFAULTS_PATH)
    const unsub = onValue(settingsRef, (snap) => {
      const v = snap.val() || {}
      setDefaults((p) => ({
        utmSource: String(v.utmSource || p.utmSource || ""),
        utmMedium: String(v.utmMedium || p.utmMedium || ""),
        utmCampaignPrefix: String(v.utmCampaignPrefix || p.utmCampaignPrefix || ""),
        defaultCurrency: String(v.defaultCurrency || p.defaultCurrency || "GBP"),
      }))
    })
    return () => unsub()
  }, [])

  // Content platform connections (shared for Content publishing)
  useEffect(() => {
    fetchPlatformSettings()
  }, [fetchPlatformSettings])

  // Social settings (accounts + credentials) live here to avoid nested tabs.
  useEffect(() => {
    const accRef = ref(db, `admin/social/accounts`)
    const credRef = ref(db, `admin/social/credentials`)

    const unsubAcc = onValue(accRef, (snap) => {
      const val = snap.val() || {}
      const rows: SocialAccount[] = Object.entries(val).map(([id, raw]: any) => ({
        id,
        platform: (raw?.platform as SocialPlatform) || "twitter",
        displayName: raw?.displayName || "",
        connected: Boolean(raw?.connected),
        createdAt: raw?.createdAt || Date.now(),
        updatedAt: raw?.updatedAt || Date.now(),
      }))
      rows.sort((a, b) => a.platform.localeCompare(b.platform))
      setSocialAccounts(rows)
    })

    const unsubCreds = onValue(credRef, (snap) => {
      const val = snap.val() || {}
      setSocialCredentials((c: any) => ({
        twitter: { accessToken: val?.twitter?.accessToken || c.twitter.accessToken || "" },
        facebook: {
          pageId: val?.facebook?.pageId || c.facebook.pageId || "",
          pageAccessToken: val?.facebook?.pageAccessToken || c.facebook.pageAccessToken || "",
        },
        linkedin: {
          authorUrn: val?.linkedin?.authorUrn || c.linkedin.authorUrn || "",
          accessToken: val?.linkedin?.accessToken || c.linkedin.accessToken || "",
        },
        instagram: {
          igUserId: val?.instagram?.igUserId || c.instagram.igUserId || "",
          accessToken: val?.instagram?.accessToken || c.instagram.accessToken || "",
        },
      }))
    })

    return () => {
      unsubAcc()
      unsubCreds()
    }
  }, [])

  const byPlatform = useMemo(() => {
    const map = new Map<string, PlatformSettings>()
    for (const s of platformSettings || []) {
      if (s?.platform) map.set(String(s.platform), s)
    }
    return map
  }, [platformSettings])

  const togglePlatform = async (platform: PlatformSettings["platform"], isConnected: boolean) => {
    const existing = byPlatform.get(platform)
    if (existing?.id) {
      await updatePlatformSettings(existing.id, { isConnected, lastSync: Date.now() })
      return
    }
    await createPlatformSettings({
      platform,
      isConnected,
      accountName: `${platform} account`,
      permissions: ["publish", "read_insights"],
      apiLimits: { postsPerDay: 25, postsPerHour: 5, remaining: 25 },
    })
  }

  const toggleSocialAccount = async (accountId: string, connected: boolean) => {
    const now = Date.now()
    await update(ref(db, `admin/social/accounts/${accountId}`), { connected, updatedAt: now })
  }

  const addSocialAccount = async (platform: SocialPlatform) => {
    const now = Date.now()
    const accRef = ref(db, `admin/social/accounts`)
    const newRef = push(accRef)
    await set(newRef, {
      platform,
      displayName: `${platform} account`,
      connected: false,
      createdAt: now,
      updatedAt: now,
    })
  }

  const save = async () => {
    try {
      setSaving(true)
      setError(null)

      if (activeTab === 0) {
        await set(ref(db, DEFAULTS_PATH), defaults as any)
      } else if (activeTab === 2) {
        await set(ref(db, `admin/social/credentials`), socialCredentials)
      }

      setSuccess("Settings saved successfully")
      setEditMode(false)
    } catch (e: any) {
      setError(e?.message || "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const tabs = useMemo(
    () => [
      { label: "General", icon: <SettingsIcon />, id: "general" },
      { label: "Platforms", icon: <PlatformsIcon />, id: "platforms" },
      { label: "Credentials", icon: <CredentialsIcon />, id: "credentials" },
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
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={() => setError(null)} severity="error">
          {error}
        </Alert>
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
            borderBottom: 1,
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
            px: { xs: 1.5, sm: 2 },
            py: 1,
            bgcolor: "grey.50",
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_e, v) => {
              setActiveTab(v)
              setEditMode(false)
            }}
            aria-label="Marketing settings tabs"
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
            {tabs.map((t) => (
              <Tab key={t.id} label={t.label} icon={t.icon} iconPosition="start" />
            ))}
          </Tabs>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {activeTab === 1 ? (
              <Typography variant="caption" color="text.secondary">
                Auto-save
              </Typography>
            ) : editMode ? (
              <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            ) : (
              <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setEditMode(true)}>
                Edit
              </Button>
            )}
          </Box>
        </Box>

        {/* General */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ px: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Basic defaults used when generating links and labels.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="UTM source"
                  fullWidth
                  value={defaults.utmSource}
                  onChange={(e) => setDefaults((p) => ({ ...p, utmSource: e.target.value }))}
                  disabled={!editMode}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="UTM medium"
                  fullWidth
                  value={defaults.utmMedium}
                  onChange={(e) => setDefaults((p) => ({ ...p, utmMedium: e.target.value }))}
                  disabled={!editMode}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Campaign prefix"
                  fullWidth
                  value={defaults.utmCampaignPrefix}
                  onChange={(e) => setDefaults((p) => ({ ...p, utmCampaignPrefix: e.target.value }))}
                  disabled={!editMode}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Default currency"
                  fullWidth
                  value={defaults.defaultCurrency}
                  onChange={(e) => setDefaults((p) => ({ ...p, defaultCurrency: e.target.value }))}
                  disabled={!editMode}
                />
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* Platforms */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ px: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Social posting requires: platform enabled below, account enabled, and credentials saved in the Credentials tab.
            </Alert>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                  Platform connections
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Enable or disable platform publishing (shared with Content).
                </Typography>

                {PLATFORMS.map((platform) => {
                  const s = byPlatform.get(platform)
                  const connected = Boolean(s?.isConnected)
                  return (
                    <Box
                      key={platform}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        p: 1.5,
                        mb: 1,
                        borderRadius: 1,
                        border: 1,
                        borderColor: "divider",
                      }}
                    >
                      <Box>
                        <Typography sx={{ fontWeight: 700, textTransform: "capitalize" }}>{platform.replace("_", " ")}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {s?.accountName || "Not connected"}
                        </Typography>
                      </Box>
                      <Switch checked={connected} onChange={(e) => void togglePlatform(platform, e.target.checked)} />
                    </Box>
                  )
                })}
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                  Social accounts
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Enable accounts per platform.
                </Typography>

                {SOCIAL_PLATFORMS.map((p) => {
                  const acc = socialAccounts.find((a) => a.platform === p)
                  const platformEnabled = Boolean(byPlatform.get(p)?.isConnected)
                  const accountEnabled = Boolean(acc?.connected)
                  const credsReady = Boolean((socialCredentialReady as any)[p])
                  const ready = platformEnabled && accountEnabled && credsReady
                  return (
                    <Box
                      key={p}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                        p: 1.5,
                        mb: 1,
                        borderRadius: 1,
                        border: 1,
                        borderColor: "divider",
                      }}
                    >
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                          <Typography sx={{ fontWeight: 700, textTransform: "capitalize" }}>{p}</Typography>
                          <Typography variant="caption" color={ready ? "success.main" : "text.secondary"}>
                            {ready ? "Ready" : "Not ready"}
                          </Typography>
                        </Box>
                        <TextField
                          size="small"
                          fullWidth
                          value={acc?.displayName || ""}
                          placeholder={acc ? "" : "Not added"}
                          disabled={!acc}
                          onChange={(e) =>
                            acc
                              ? void update(ref(db, `admin/social/accounts/${acc.id}`), {
                                  displayName: e.target.value,
                                  updatedAt: Date.now(),
                                })
                              : undefined
                          }
                          sx={{ mt: 1 }}
                        />

                        {!platformEnabled ? (
                          <Typography variant="caption" color="warning.main" sx={{ display: "block", mt: 0.5 }}>
                            Platform disabled (enable in Platform connections)
                          </Typography>
                        ) : null}
                        {acc && !credsReady ? (
                          <Typography variant="caption" color="warning.main" sx={{ display: "block", mt: 0.5 }}>
                            Missing credentials (check Credentials tab)
                          </Typography>
                        ) : null}
                      </Box>
                      {!acc ? (
                        <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => void addSocialAccount(p)}>
                          Add
                        </Button>
                      ) : (
                        <Switch checked={Boolean(acc.connected)} onChange={(e) => void toggleSocialAccount(acc.id, e.target.checked)} />
                      )}
                    </Box>
                  )
                })}
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* Credentials */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ px: 2 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Tokens are stored in RTDB at <code>admin/social/credentials</code>. For production, move these server-side.
            </Alert>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                  Twitter / X
                </Typography>
                <TextField
                  label="Access token"
                  fullWidth
                  value={socialCredentials.twitter.accessToken}
                  onChange={(e) => setSocialCredentials((p: any) => ({ ...p, twitter: { ...p.twitter, accessToken: e.target.value } }))}
                  disabled={!editMode}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                  Facebook
                </Typography>
                <TextField
                  label="Page ID"
                  fullWidth
                  value={socialCredentials.facebook.pageId}
                  onChange={(e) => setSocialCredentials((p: any) => ({ ...p, facebook: { ...p.facebook, pageId: e.target.value } }))}
                  disabled={!editMode}
                  sx={{ mb: 1.5 }}
                />
                <TextField
                  label="Page access token"
                  fullWidth
                  value={socialCredentials.facebook.pageAccessToken}
                  onChange={(e) => setSocialCredentials((p: any) => ({ ...p, facebook: { ...p.facebook, pageAccessToken: e.target.value } }))}
                  disabled={!editMode}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                  LinkedIn
                </Typography>
                <TextField
                  label="Author URN"
                  fullWidth
                  value={socialCredentials.linkedin.authorUrn}
                  onChange={(e) => setSocialCredentials((p: any) => ({ ...p, linkedin: { ...p.linkedin, authorUrn: e.target.value } }))}
                  disabled={!editMode}
                  sx={{ mb: 1.5 }}
                />
                <TextField
                  label="Access token"
                  fullWidth
                  value={socialCredentials.linkedin.accessToken}
                  onChange={(e) => setSocialCredentials((p: any) => ({ ...p, linkedin: { ...p.linkedin, accessToken: e.target.value } }))}
                  disabled={!editMode}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                  Instagram
                </Typography>
                <TextField
                  label="IG User ID"
                  fullWidth
                  value={socialCredentials.instagram.igUserId}
                  onChange={(e) => setSocialCredentials((p: any) => ({ ...p, instagram: { ...p.instagram, igUserId: e.target.value } }))}
                  disabled={!editMode}
                  sx={{ mb: 1.5 }}
                />
                <TextField
                  label="Access token"
                  fullWidth
                  value={socialCredentials.instagram.accessToken}
                  onChange={(e) => setSocialCredentials((p: any) => ({ ...p, instagram: { ...p.instagram, accessToken: e.target.value } }))}
                  disabled={!editMode}
                />
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  )
}

