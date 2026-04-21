/**
 * POS Integration Settings Component
 * Manages POS system integrations (Lightspeed, Square, Toast, etc.)
 */

"use client"

import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Snackbar,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material'
import {
  Sync as SyncIcon,
  CheckCircle as CheckCircleIcon,
  Link as LinkIcon,
  Settings as SettingsIcon,
  Help as HelpIcon,
  ContentCopy as CopyIcon,
  ExpandMore as ExpandMoreIcon,
  Check as CheckIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material'
import { useCompany } from '../../../backend/context/CompanyContext'
import { APP_KEYS } from '../../../backend/config/keys'
import { LightspeedSettings } from '../../../backend/services/pos-integration/types'
import { auth, db, ref, get, set } from '../../../backend/services/Firebase'

const FUNCTIONS_BASE_URL = `https://${APP_KEYS.firebase.functionsRegion || 'us-central1'}-${APP_KEYS.firebase.projectId}.cloudfunctions.net`
const LIGHTSPEED_CALLBACK_URL = `${FUNCTIONS_BASE_URL}/oauthCallbackLightspeedK`
/** Must match server defaults (`LIGHTSPEED_K_DEFAULT_SCOPES` in Cloud Functions). */
const LIGHTSPEED_OAUTH_SCOPES = 'items orders-api financial-api offline_access'

interface POSIntegrationSettingsProps {
  companyId?: string
  siteId?: string
  subsiteId?: string
}

const POSIntegrationSettings: React.FC<POSIntegrationSettingsProps> = ({
  companyId: propCompanyId,
  siteId: propSiteId,
  subsiteId: propSubsiteId,
}) => {
  const { state: companyState } = useCompany()
  const companyId = propCompanyId || companyState.companyID
  const siteId = propSiteId || companyState.selectedSiteID
  const subsiteId = propSubsiteId || companyState.selectedSubsiteID

  const [settings, setSettings] = useState<LightspeedSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [guideExpanded, setGuideExpanded] = useState(true)
  const [copied, setCopied] = useState(false)

  // Form state
  const [syncProducts, setSyncProducts] = useState(true)
  const [syncSales, setSyncSales] = useState(true)
  const [syncCustomers, setSyncCustomers] = useState(false)
  const [syncInventory, setSyncInventory] = useState(true)
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false)
  const [autoSyncInterval, setAutoSyncInterval] = useState(60) // minutes

  // Dialog states
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false)

  // Load settings
  useEffect(() => {
    if (companyId) {
      loadSettings()
    }
  }, [companyId, siteId, subsiteId])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('provider') === 'lightspeed' && params.get('success') === 'true') {
      setSuccess('Successfully connected to Lightspeed!')
      setTimeout(() => setSuccess(null), 3000)
    }
  }, [])

  // Get settings path based on company/site/subsite level
  const getSettingsPath = () => {
    if (!companyId) return null
    let path = `companies/${companyId}`
    
    if (subsiteId && siteId) {
      // Subsite level
      path = `companies/${companyId}/sites/${siteId}/subsites/${subsiteId}/settings/lightspeedIntegration`
    } else if (siteId) {
      // Site level
      path = `companies/${companyId}/sites/${siteId}/settings/lightspeedIntegration`
    } else {
      // Company level
      path = `companies/${companyId}/settings/lightspeedIntegration`
    }
    
    return path
  }

  const buildSettingsPayload = (currentSettings: LightspeedSettings | null): Record<string, any> => {
    const source = currentSettings || settings
    const payload: Record<string, any> = {
      ...(source || {}),
      provider: 'lightspeed',
      redirectUri: LIGHTSPEED_CALLBACK_URL,
      syncProducts,
      syncSales,
      syncCustomers,
      syncInventory,
      autoSyncEnabled,
      autoSyncInterval,
      updatedAt: Date.now(),
    }

    ;[
      'clientId',
      'clientSecret',
      'accessToken',
      'refreshToken',
      'oauthState',
      'oauthStateExpiry',
    ].forEach((key) => {
      delete payload[key]
    })

    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) {
        delete payload[key]
      }
    })

    return payload
  }

  const getAuthToken = async () => {
    const user = auth.currentUser
    if (!user) {
      throw new Error('You must be signed in to manage Lightspeed')
    }
    return user.getIdToken()
  }

  const secureRequest = async (path: string, init?: RequestInit) => {
    const token = await getAuthToken()
    const response = await fetch(`${FUNCTIONS_BASE_URL}/${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init?.headers || {}),
      },
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || data?.ok === false) {
      throw new Error(data?.error || `Request failed (${response.status})`)
    }
    return data
  }

  const loadSettings = async () => {
    if (!companyId) return

    try {
      setLoading(true)
      const settingsPath = getSettingsPath()
      if (!settingsPath) return
      
      const settingsRef = ref(db, settingsPath)
      const snapshot = await get(settingsRef)

      if (snapshot.exists()) {
        const data = snapshot.val() || {}
        const {
          clientId: _clientId,
          clientSecret: _clientSecret,
          accessToken: _accessToken,
          refreshToken: _refreshToken,
          oauthState: _oauthState,
          oauthStateExpiry: _oauthStateExpiry,
          ...safeData
        } = data
        setSettings(safeData)
        setSyncProducts(safeData.syncProducts !== undefined ? safeData.syncProducts : true)
        setSyncSales(safeData.syncSales !== undefined ? safeData.syncSales : true)
        setSyncCustomers(safeData.syncCustomers !== undefined ? safeData.syncCustomers : false)
        setSyncInventory(safeData.syncInventory !== undefined ? safeData.syncInventory : true)
        setAutoSyncEnabled(safeData.autoSyncEnabled !== undefined ? safeData.autoSyncEnabled : false)
        setAutoSyncInterval(safeData.autoSyncInterval || 60)
      } else {
        // Initialize default settings
        const defaultSettings: LightspeedSettings = {
          provider: 'lightspeed',
          isEnabled: false,
          isConnected: false,
          syncStatus: 'idle',
          redirectUri: LIGHTSPEED_CALLBACK_URL,
          autoSyncEnabled: false,
          autoSyncInterval: 60,
          syncProducts: true,
          syncSales: true,
          syncCustomers: false,
          syncInventory: true,
          createdAt: Date.now(),
        }
        setSettings(defaultSettings)
      }
    } catch (err: any) {
      console.error('Error loading settings:', err)
      setError(err.message || 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!companyId || !settings) return

    try {
      setSaving(true)
      setError(null)
      const updatedSettings = buildSettingsPayload(settings)

      const settingsPath = getSettingsPath()
      if (!settingsPath) return
      
      const settingsRef = ref(db, settingsPath)
      await set(settingsRef, updatedSettings)

      setSettings(updatedSettings)
      setSuccess('Settings saved successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      console.error('Error saving settings:', err)
      setError(err.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleConnect = async () => {
    if (!companyId || !settings) return

    try {
      setSaving(true)
      setError(null)

      const settingsPath = getSettingsPath()
      if (settingsPath) {
        await set(ref(db, settingsPath), buildSettingsPayload(settings))
      }

      const params = new URLSearchParams({
        company_id: companyId,
        return_path: window.location.pathname,
        scope: LIGHTSPEED_OAUTH_SCOPES,
      })
      if (siteId) params.set('site_id', siteId)
      if (subsiteId) params.set('subsite_id', subsiteId)
      if (settings.environment === 'trial') params.set('environment', 'trial')

      window.location.href = `${FUNCTIONS_BASE_URL}/oauthLightspeedK?${params.toString()}`
    } catch (err: any) {
      console.error('Error starting Lightspeed OAuth:', err)
      setError(err.message || 'Failed to start Lightspeed connection')
      setSaving(false)
    }
  }

  const handleDisconnect = async () => {
    if (!companyId) return

    try {
      setLoading(true)
      setError(null)

      await secureRequest('lightspeedKDisconnect', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          ...(siteId ? { siteId } : {}),
          ...(subsiteId ? { subsiteId } : {}),
        }),
      })

      await loadSettings()
      setSuccess('Disconnected from Lightspeed')
      setTimeout(() => setSuccess(null), 3000)
      setDisconnectDialogOpen(false)
    } catch (err: any) {
      console.error('Error disconnecting:', err)
      setError(err.message || 'Failed to disconnect')
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    if (!companyId || !siteId || !settings) return

    try {
      setSyncing(true)
      setError(null)

      const settingsPath = getSettingsPath()
      if (settingsPath) {
        await set(ref(db, settingsPath), buildSettingsPayload(settings))
      }

      await secureRequest('lightspeedKRunSync', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          siteId,
          ...(subsiteId ? { subsiteId } : {}),
          syncProducts,
          syncSales,
          syncInventory,
          ...(settings.businessLocationId ? { businessLocationId: settings.businessLocationId } : {}),
        }),
      })

      await loadSettings()
      setSuccess('Sync completed successfully!')
      setTimeout(() => setSuccess(null), 5000)
    } catch (err: any) {
      console.error('Error syncing:', err)
      setError(err.message || 'Failed to sync')
      await loadSettings().catch(() => {})
    } finally {
      setSyncing(false)
    }
  }

  if (loading && !settings) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    )
  }

  const isConnected = settings?.isConnected || false

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardHeader
          title="Lightspeed Retail Integration"
          subheader="Connect your Lightspeed Retail (X-Series) account to sync products, sales, and inventory"
          avatar={<SettingsIcon />}
          action={
            isConnected && (
              <Chip
                icon={<CheckCircleIcon />}
                label="Connected"
                color="success"
                variant="outlined"
              />
            )
          }
        />
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          {!isConnected ? (
            <>
              {/* Step-by-Step Guide */}
              <Accordion expanded={guideExpanded} onChange={() => setGuideExpanded(!guideExpanded)} sx={{ mb: 3 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HelpIcon color="primary" />
                    <Typography variant="h6">Step-by-Step Connection Guide</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Stepper orientation="vertical" activeStep={-1}>
                    <Step>
                      <StepLabel>
                        <Typography variant="subtitle1" fontWeight="bold">
                          Step 1: Register as a Developer
                        </Typography>
                      </StepLabel>
                      <StepContent>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          If you don't have a Lightspeed Developer account yet:
                        </Typography>
                        <Box sx={{ mb: 2 }}>
                          <Button
                            variant="outlined"
                            startIcon={<OpenInNewIcon />}
                            href="https://developers.lightspeedhq.com"
                            target="_blank"
                            rel="noopener"
                            sx={{ mb: 1 }}
                          >
                            Open Lightspeed Developer Portal
                          </Button>
                        </Box>
                        <Typography variant="body2" color="text.secondary" component="div">
                          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                            <li>Click "Sign Up" or "Register"</li>
                            <li>Create your developer account (separate from your Lightspeed Retail account)</li>
                            <li>Verify your email address</li>
                          </ul>
                        </Typography>
                      </StepContent>
                    </Step>

                    <Step>
                      <StepLabel>
                        <Typography variant="subtitle1" fontWeight="bold">
                          Step 2: Create Your Application
                        </Typography>
                      </StepLabel>
                      <StepContent>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Once logged into the Developer Portal:
                        </Typography>
                        <Typography variant="body2" color="text.secondary" component="div">
                          <ol style={{ marginTop: 8, paddingLeft: 20 }}>
                            <li>Go to "Applications" or "My Apps"</li>
                            <li>Click "Create New Application" or "Add Application"</li>
                            <li>Select "Lightspeed Retail (X-Series)" as the platform</li>
                            <li>Enter an application name (e.g., "1Stop Integration")</li>
                            <li>Add a description (optional)</li>
                          </ol>
                        </Typography>
                      </StepContent>
                    </Step>

                    <Step>
                      <StepLabel>
                        <Typography variant="subtitle1" fontWeight="bold">
                          Step 3: Configure Redirect URI
                        </Typography>
                      </StepLabel>
                      <StepContent>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          In your Lightspeed application settings, you need to add the redirect URI. 
                          You can add multiple redirect URIs for both development and production:
                        </Typography>
                        
                        {/* Development Redirect URI */}
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
                            For Local Development:
                          </Typography>
                          <Paper
                            variant="outlined"
                            sx={{
                              p: 2,
                              bgcolor: 'background.default',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 2,
                            }}
                          >
                            <Typography
                              variant="body2"
                              component="code"
                              sx={{
                                fontFamily: 'monospace',
                                fontSize: '0.875rem',
                                wordBreak: 'break-all',
                                flex: 1,
                              }}
                            >
                              http://localhost:5173/oauth/callback/lightspeed
                            </Typography>
                            <Tooltip title="Copy to clipboard">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  navigator.clipboard.writeText('http://localhost:5173/oauth/callback/lightspeed')
                                  setCopied(true)
                                  setTimeout(() => setCopied(false), 2000)
                                }}
                              >
                                {copied ? <CheckIcon color="success" /> : <CopyIcon />}
                              </IconButton>
                            </Tooltip>
                          </Paper>
                        </Box>

                        {/* Production Redirect URI */}
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
                            For Production (Current URL):
                          </Typography>
                          <Paper
                            variant="outlined"
                            sx={{
                              p: 2,
                              bgcolor: 'background.default',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 2,
                            }}
                          >
                            <Typography
                              variant="body2"
                              component="code"
                              sx={{
                                fontFamily: 'monospace',
                                fontSize: '0.875rem',
                                wordBreak: 'break-all',
                                flex: 1,
                              }}
                            >
                              {LIGHTSPEED_CALLBACK_URL}
                            </Typography>
                            <Tooltip title="Copy to clipboard">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  navigator.clipboard.writeText(LIGHTSPEED_CALLBACK_URL)
                                  setCopied(true)
                                  setTimeout(() => setCopied(false), 2000)
                                }}
                              >
                                {copied ? <CheckIcon color="success" /> : <CopyIcon />}
                              </IconButton>
                            </Tooltip>
                          </Paper>
                        </Box>

                        <Alert severity="warning" sx={{ mb: 2 }}>
                          <Typography variant="body2">
                            <strong>Before you can connect Lightspeed:</strong>
                            <br />
                            You must add at least one redirect URI in your Lightspeed application settings first. 
                            Copy the appropriate URI above and paste it into the "Redirect URI" or "Callback URL" field 
                            in your Lightspeed Developer Portal application settings, then save.
                          </Typography>
                        </Alert>

                        <Alert severity="info" sx={{ mb: 2 }}>
                          <Typography variant="body2">
                            <strong>Tip:</strong> You can add both development and production redirect URIs in Lightspeed. 
                            This allows you to test locally and use the same app in production.
                          </Typography>
                        </Alert>

                        <Typography variant="body2" color="text.secondary" component="div">
                          <strong>Steps:</strong>
                          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                            <li>Copy the redirect URI(s) above (development and/or production)</li>
                            <li>Go to your Lightspeed Developer Portal → Applications → Your App</li>
                            <li>Find the "Redirect URI" or "Callback URL" field</li>
                            <li>Paste the redirect URI(s) and click "Save" or "Update"</li>
                            <li>After saving, return here and start the secure server-side connection flow</li>
                          </ul>
                        </Typography>
                      </StepContent>
                    </Step>

                    <Step>
                      <StepLabel>
                        <Typography variant="subtitle1" fontWeight="bold">
                          Step 4: Get Your Credentials
                        </Typography>
                      </StepLabel>
                      <StepContent>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          After creating your application, you'll see:
                        </Typography>
                        <Typography variant="body2" color="text.secondary" component="div">
                          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                            <li><strong>Redirect URI:</strong> Must match the server callback shown below</li>
                            <li><strong>OAuth approval:</strong> Lightspeed will ask you to authorize access after you click connect</li>
                          </ul>
                        </Typography>
                        <Alert severity="warning" sx={{ mt: 2 }}>
                          <Typography variant="body2">
                            <strong>Security note:</strong> The app now keeps OAuth credentials and tokens on the server side instead of in the browser.
                          </Typography>
                        </Alert>
                      </StepContent>
                    </Step>

                    <Step>
                      <StepLabel>
                        <Typography variant="subtitle1" fontWeight="bold">
                          Step 5: Enter Credentials & Connect
                        </Typography>
                      </StepLabel>
                      <StepContent>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Confirm the redirect URI below, then click "Connect to Lightspeed":
                        </Typography>
                        <Typography variant="body2" color="text.secondary" component="div">
                          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                            <li>Copy the redirect URI into your Lightspeed developer app</li>
                            <li>Verify the redirect URI matches what you set in Lightspeed</li>
                            <li>Click "Connect to Lightspeed"</li>
                            <li>You'll be redirected to Lightspeed to authorize the connection</li>
                            <li>After authorization, you'll be redirected back automatically</li>
                          </ul>
                        </Typography>
                      </StepContent>
                    </Step>
                  </Stepper>
                </AccordionDetails>
              </Accordion>

              <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 2 }}>
                Connect Lightspeed Securely
              </Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ '& .MuiAlert-message': { width: '100%' } }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Redirect URI is fixed for this deployment. Register this exact URL in your Lightspeed app, then connect:
                    </Typography>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        bgcolor: 'background.default',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                      }}
                    >
                      <Typography
                        variant="body2"
                        component="code"
                        sx={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all', flex: 1 }}
                      >
                        {LIGHTSPEED_CALLBACK_URL}
                      </Typography>
                      <Tooltip title="Copy redirect URI">
                        <IconButton
                          size="small"
                          onClick={() => {
                            navigator.clipboard.writeText(LIGHTSPEED_CALLBACK_URL)
                            setCopied(true)
                            setTimeout(() => setCopied(false), 2000)
                          }}
                        >
                          {copied ? <CheckIcon color="success" /> : <CopyIcon />}
                        </IconButton>
                      </Tooltip>
                    </Paper>
                  </Alert>
                </Grid>
                <Grid item xs={12}>
                  <Alert severity="info">
                    Lightspeed OAuth credentials are now managed server-side for this deployment. This page no longer stores a client secret in the browser.
                  </Alert>
                </Grid>
              </Grid>

              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleConnect}
                  disabled={saving}
                  startIcon={<LinkIcon />}
                  size="large"
                  sx={{ minWidth: 200 }}
                >
                  {saving ? 'Connecting...' : 'Connect to Lightspeed'}
                </Button>
              </Box>

              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  <strong>Need help?</strong> Click the guide above for detailed step-by-step instructions.
                  If you encounter issues, make sure your redirect URI matches exactly in both places.
                </Typography>
              </Alert>
            </>
          ) : (
            <>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  columnGap: 1.5,
                  rowGap: 0.5,
                  mb: 1.5,
                  typography: 'caption',
                  color: 'text.secondary',
                }}
              >
                <Typography component="span" variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  {settings?.businessLocationName || settings?.businessName || 'Lightspeed'}
                </Typography>
                <Typography component="span" variant="caption" aria-hidden>
                  ·
                </Typography>
                <Typography component="span" variant="caption">
                  {subsiteId ? 'Subsite' : siteId ? 'Site' : 'Company'}
                </Typography>
                {settings?.environment && (
                  <>
                    <Typography component="span" variant="caption" aria-hidden>
                      ·
                    </Typography>
                    <Typography component="span" variant="caption">
                      {settings.environment === 'trial' ? 'Trial' : 'Prod'}
                    </Typography>
                  </>
                )}
                {settings?.lastSyncAt && (
                  <>
                    <Typography component="span" variant="caption" aria-hidden>
                      ·
                    </Typography>
                    <Typography component="span" variant="caption" sx={{ whiteSpace: 'nowrap' }}>
                      Last: {new Date(settings.lastSyncAt).toLocaleString()}
                    </Typography>
                  </>
                )}
                {settings?.syncStatus === 'syncing' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: { xs: 0, sm: 0.5 } }}>
                    <CircularProgress size={12} />
                    <Typography component="span" variant="caption">
                      Syncing…
                    </Typography>
                  </Box>
                )}
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Sync options
              </Typography>

              <Grid container spacing={0.5} alignItems="center" sx={{ mb: 1.5 }}>
                <Grid item xs={3} sx={{ minWidth: 0 }}>
                  <Tooltip title="Import products from Lightspeed into your stock system">
                    <FormControlLabel
                      sx={{ m: 0, '& .MuiFormControlLabel-label': { fontSize: '0.75rem' } }}
                      control={
                        <Switch
                          size="small"
                          checked={syncProducts}
                          onChange={(e) => setSyncProducts(e.target.checked)}
                        />
                      }
                      label="Products"
                    />
                  </Tooltip>
                </Grid>
                <Grid item xs={3} sx={{ minWidth: 0 }}>
                  <Tooltip title="Import sales transactions from Lightspeed into your POS system">
                    <FormControlLabel
                      sx={{ m: 0, '& .MuiFormControlLabel-label': { fontSize: '0.75rem' } }}
                      control={
                        <Switch size="small" checked={syncSales} onChange={(e) => setSyncSales(e.target.checked)} />
                      }
                      label="Sales"
                    />
                  </Tooltip>
                </Grid>
                <Grid item xs={3} sx={{ minWidth: 0 }}>
                  <Tooltip title="Update inventory levels from Lightspeed">
                    <FormControlLabel
                      sx={{ m: 0, '& .MuiFormControlLabel-label': { fontSize: '0.75rem' } }}
                      control={
                        <Switch
                          size="small"
                          checked={syncInventory}
                          onChange={(e) => setSyncInventory(e.target.checked)}
                        />
                      }
                      label="Inventory"
                    />
                  </Tooltip>
                </Grid>
                <Grid item xs={3} sx={{ minWidth: 0 }}>
                  <Tooltip title="Import customer data from Lightspeed">
                    <FormControlLabel
                      sx={{ m: 0, '& .MuiFormControlLabel-label': { fontSize: '0.75rem' } }}
                      control={
                        <Switch
                          size="small"
                          checked={syncCustomers}
                          onChange={(e) => setSyncCustomers(e.target.checked)}
                        />
                      }
                      label="Customers"
                    />
                  </Tooltip>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                <Grid item xs={12} sm="auto">
                  <Tooltip title='Server checks about every 15 minutes; interval is the minimum time between successful runs. Save after changing.'>
                    <FormControlLabel
                      sx={{ m: 0, '& .MuiFormControlLabel-label': { fontSize: '0.8125rem' } }}
                      control={
                        <Switch
                          size="small"
                          checked={autoSyncEnabled}
                          onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                        />
                      }
                      label="Auto sync"
                    />
                  </Tooltip>
                </Grid>
                {autoSyncEnabled && (
                  <Grid item xs={12} sm={4} md={3}>
                    <FormControl size="small" fullWidth sx={{ maxWidth: 220 }}>
                      <InputLabel id="ls-auto-interval">Interval</InputLabel>
                      <Select
                        labelId="ls-auto-interval"
                        value={autoSyncInterval}
                        onChange={(e) => setAutoSyncInterval(e.target.value as number)}
                        label="Interval"
                      >
                        <MenuItem value={15}>15 min</MenuItem>
                        <MenuItem value={30}>30 min</MenuItem>
                        <MenuItem value={60}>1 hr</MenuItem>
                        <MenuItem value={240}>4 hr</MenuItem>
                        <MenuItem value={1440}>Daily</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                )}
              </Grid>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  onClick={handleSync}
                  disabled={syncing || !companyId}
                  startIcon={syncing ? <CircularProgress size={16} /> : <SyncIcon />}
                >
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </Button>

                <Button variant="outlined" size="small" onClick={saveSettings} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>

                <Button variant="outlined" size="small" color="error" onClick={() => setDisconnectDialogOpen(true)}>
                  Disconnect
                </Button>
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* Disconnect Confirmation Dialog */}
      <Dialog open={disconnectDialogOpen} onClose={() => setDisconnectDialogOpen(false)}>
        <DialogTitle>Disconnect Lightspeed?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to disconnect from Lightspeed? You'll need to reconnect and re-authorize to sync data again.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisconnectDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDisconnect} color="error" variant="contained">
            Disconnect
          </Button>
        </DialogActions>
      </Dialog>

      {/* Copy Success Snackbar */}
      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        message="Redirect URI copied to clipboard!"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  )
}

export default POSIntegrationSettings

