"use client"

import { themeConfig } from "../../../../theme/AppTheme";
import React, { useState, useEffect } from "react"
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  CardHeader,
  Grid,
  FormControlLabel,
  Switch,
  Alert,
  Snackbar,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material"
import {
  Save as SaveIcon,
  VpnKey as VpnKeyIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  Help as HelpIcon,
  Refresh as RefreshIcon,
  Article as ArticleIcon,
} from "@mui/icons-material"
import { useCompany } from "../../../../backend/context/CompanyContext"
import { fetchHMRCSettings, saveHMRCSettings } from "../../../../backend/functions/HMRCSettings"
import { HMRCAuthService } from "../../../../backend/services/hmrc"
import type { HMRCSettings } from "../../../../backend/interfaces/Company"
import { useSettings } from "../../../../backend/context/SettingsContext"
import { APP_KEYS, getFunctionsBaseUrl } from "../../../../config/keys"
import { auth, functions, httpsCallable } from "../../../../backend/services/Firebase"

type HMRCConnectionStatus = "disconnected" | "connected" | "expired"

interface HMRCConnectionMeta {
  status: HMRCConnectionStatus
  foundAt: "company" | "site" | "subsite" | null
  tokenExpiry?: number
  hasClientSecret?: boolean
}

const HMRCSettingsTab: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { state: companyState } = useCompany()
  const { state: settingsState } = useSettings()
  const companyId = companyState.companyID
  const siteId = companyState.selectedSiteID
  const subsiteId = companyState.selectedSubsiteID
  const userId = settingsState.auth.uid

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [hmrcSettings, setHmrcSettings] = useState<Partial<HMRCSettings> | null>(null)
  const [settingsLevel, setSettingsLevel] = useState<"company" | "site" | "subsite">("subsite")
  const [settingsFoundAt, setSettingsFoundAt] = useState<"company" | "site" | "subsite" | null>(null)

  // OAuth state
  const [oauthConnecting, setOauthConnecting] = useState(false)
  const [oauthStatus, setOauthStatus] = useState<HMRCConnectionStatus>('disconnected')
  const [connectionMeta, setConnectionMeta] = useState<HMRCConnectionMeta | null>(null)
  
  // Test API state
  const [testingAPI, setTestingAPI] = useState(false)
  const [submittingTestEPS, setSubmittingTestEPS] = useState(false)
  
  // Help dialog state
  const [helpDialogOpen, setHelpDialogOpen] = useState(false)

  // Initialize with defaults
  const defaultSettings: Partial<HMRCSettings> = {
    employerPAYEReference: "",
    accountsOfficeReference: "",
    hmrcOfficeNumber: "",
    hmrcEnvironment: "sandbox",
    autoSubmitFPS: false,
    requireFPSApproval: true,
    fpsSubmissionLeadTime: 0,
    isApprenticeshipLevyPayer: false,
    apprenticeshipLevyAllowance: 15000,
    apprenticeshipLevyRate: 0.005,
    claimsEmploymentAllowance: false,
    employmentAllowanceAmount: 5000,
    employmentAllowanceUsed: 0,
    hmrcPaymentDay: 19,
    hmrcPaymentMethod: "direct_debit",
    isRegisteredTroncOperator: false,
    currentTaxYear: "2024-25",
    fiscalYearEnd: "05-04",
    useSandboxForTesting: true,
    autoEnrolmentPostponement: 0,
    postponementLetterSent: false,
    yearEndRemindersSent: false,
    notifyBeforeFPSDeadline: true,
    notifyBeforePaymentDeadline: true,
    notificationLeadDays: 3,
    payrollRetentionYears: 6,
    autoArchiveOldRecords: false,
    connectedCompanies: [],
  }

  // Determine default level based on what's selected
  useEffect(() => {
    if (subsiteId && siteId) {
      setSettingsLevel("subsite")
    } else if (siteId) {
      setSettingsLevel("site")
    } else if (companyId) {
      setSettingsLevel("company")
    }
  }, [companyId, siteId, subsiteId])

  // Load settings on mount
  useEffect(() => {
    if (companyId) {
      loadSettings()
    }
  }, [companyId, siteId, subsiteId])

  const loadConnectionStatus = async () => {
    if (!companyId || !functions) {
      setConnectionMeta(null)
      setOauthStatus('disconnected')
      return
    }

    try {
      const getConnectionStatus = httpsCallable(functions, 'hmrcGetConnectionStatus')
      const result = await getConnectionStatus({
        companyId,
        siteId: siteId || null,
        subsiteId: subsiteId || null,
      })
      const data = (result.data || {}) as HMRCConnectionMeta & { connected?: boolean }
      const nextStatus: HMRCConnectionStatus =
        data.status === 'connected' || data.status === 'expired' ? data.status : 'disconnected'
      setConnectionMeta({
        status: nextStatus,
        foundAt: data.foundAt || null,
        tokenExpiry: data.tokenExpiry,
        hasClientSecret: data.hasClientSecret,
      })
      setOauthStatus(nextStatus)
    } catch (err: any) {
      setConnectionMeta(null)
      setOauthStatus('disconnected')
      setError((prev) => prev || `Failed to check HMRC connection: ${err.message}`)
    }
  }

  const loadSettings = async () => {
    if (!companyId) return

    setError(null)

    try {
      const { settings, foundAt } = await fetchHMRCSettings(companyId, siteId || null, subsiteId || null)
      if (settings) {
        setHmrcSettings(settings)
        setSettingsFoundAt(foundAt)
        // If settings found, use that level as the default
        if (foundAt) {
          setSettingsLevel(foundAt)
        }
      } else {
        setHmrcSettings(defaultSettings)
        setSettingsFoundAt(null)
      }
      await loadConnectionStatus()
    } catch (err: any) {
      console.error('Error loading HMRC settings:', err)
      setError(`Failed to load settings: ${err.message}`)
      setHmrcSettings(defaultSettings)
      setSettingsFoundAt(null)
      setConnectionMeta(null)
      setOauthStatus('disconnected')
    }
  }

  const handleSave = async () => {
    if (!companyId) {
      setError('Company ID missing')
      return
    }

    // Validate level selection
    if (settingsLevel === "subsite" && (!siteId || !subsiteId)) {
      setError('Subsite must be selected to save at subsite level')
      return
    }
    if (settingsLevel === "site" && !siteId) {
      setError('Site must be selected to save at site level')
      return
    }

    // Validate required fields
    if (!hmrcSettings?.employerPAYEReference) {
      setError('PAYE reference is required')
      return
    }

    if (!hmrcSettings?.accountsOfficeReference) {
      setError('Accounts Office reference is required')
      return
    }

    // Extract office number from PAYE reference
    const payeRef = hmrcSettings.employerPAYEReference
    const officeNumber = payeRef.split('/')[0] || ""

    setSaving(true)
    setError(null)

    try {
      await saveHMRCSettings(companyId, siteId || null, subsiteId || null, settingsLevel, {
        ...hmrcSettings,
        hmrcOfficeNumber: officeNumber,
      } as Partial<HMRCSettings>)

      await loadSettings()
      setSuccess('HMRC settings saved successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      console.error('Error saving HMRC settings:', err)
      setError(`Failed to save settings: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleConnectHMRC = async () => {
    if (!companyId || !hmrcSettings) {
      setError('Please save basic settings first')
      return
    }

    const clientId = APP_KEYS.hmrc.clientId || hmrcSettings.hmrcClientId

    if (!clientId) {
      setError('HMRC client ID is not configured. Please save your HMRC client ID or contact your platform administrator.')
      return
    }

    setOauthConnecting(true)
    setError(null)

    try {
      const authService = new HMRCAuthService()
      const redirectUri = APP_KEYS.hmrc.redirectUri || `${window.location.origin}/hmrc/callback`
      const scope = APP_KEYS.hmrc.oauthScope || 'hello' // Default to 'hello' for Hello World testing

      const oauthState = (() => {
        if (window.crypto?.getRandomValues) {
          const bytes = new Uint8Array(32)
          window.crypto.getRandomValues(bytes)
          return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
        }
        return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
      })()
      
      try {
        const authUrl = authService.getAuthorizationUrl(
          clientId,
          redirectUri,
          scope,
          hmrcSettings.hmrcEnvironment || 'sandbox',
          oauthState
        )

        sessionStorage.setItem('hmrc_oauth_state', JSON.stringify({
          companyId,
          siteId,
          subsiteId,
          level: settingsLevel,
          environment: hmrcSettings.hmrcEnvironment,
          state: oauthState,
        }))

        window.location.href = authUrl
      } catch (authError: any) {
        setError(`Failed to initiate OAuth: ${authError.message}`)
        setOauthConnecting(false)
      }
    } catch (err: any) {
      setError(`Failed to connect to HMRC: ${err.message}. Make sure you've subscribed to "Real Time Information online" API and the redirect URI matches exactly in HMRC Developer Hub.`)
      setOauthConnecting(false)
    }
  }

  const handleRefreshToken = async () => {
    if (!companyId || !hmrcSettings) return

    setOauthConnecting(true)
    setError(null)

    try {
      if (!functions) {
        throw new Error('Firebase Functions is not available.')
      }

      const refreshAccessToken = httpsCallable(functions, 'hmrcRefreshAccessToken')
      await refreshAccessToken({
        companyId,
        siteId: siteId || null,
        subsiteId: subsiteId || null,
      })

      setSuccess('Token refreshed successfully!')
      await loadSettings()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(`Failed to refresh token: ${err.message}`)
    } finally {
      setOauthConnecting(false)
    }
  }

  const handleTestAPIConnection = async () => {
    if (!companyId) {
      setError('Company ID is missing. Please refresh the page and try again.')
      return
    }

    if (!hmrcSettings) {
      setError('HMRC settings not loaded. Please wait for settings to load or refresh the page.')
      return
    }

    // Validate required fields before making the call
    if (!hmrcSettings.employerPAYEReference?.trim()) {
      setError('PAYE Reference is required. Please add your PAYE Reference in HMRC settings.')
      return
    }

    if (!hmrcSettings.accountsOfficeReference?.trim()) {
      setError('Accounts Office Reference is required. Please add your Accounts Office Reference in HMRC settings.')
      return
    }

    if (oauthStatus === 'disconnected') {
      setError('HMRC OAuth not connected. Please connect to HMRC first using the "Connect to HMRC" button.')
      return
    }

    setTestingAPI(true)
    setError(null)
    setSuccess(null)

    try {
      // Get Firebase Functions base URL
      const fnBase = getFunctionsBaseUrl({
        projectId: APP_KEYS.firebase.projectId || 'stop-test-8025f',
        region: APP_KEYS.firebase.functionsRegion || 'us-central1',
      })

      // Generate fraud prevention headers from client (if available)
      const fraudHeaders: Record<string, string> = {
        'Gov-Client-Connection-Method': 'WEB_APP_VIA_SERVER',
        'Gov-Client-Device-ID': localStorage.getItem('hmrc-device-id') || `client-${Date.now()}`,
        'Gov-Client-User-IDs': userId ? `os=${userId}` : '',
        'Gov-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        'Gov-Client-Local-IPs': '',
        'Gov-Client-Screens': `${window.screen.width}x${window.screen.height}`,
        'Gov-Client-Window-Size': `${window.innerWidth}x${window.innerHeight}`,
        'Gov-Client-Browser-Plugins': '',
        'Gov-Client-Browser-JS-User-Agent': navigator.userAgent || '',
        'Gov-Client-Browser-Do-Not-Track': navigator.doNotTrack || 'false',
        'Gov-Client-Multi-Factor': ''
      }

      // Store device ID for future use
      if (!localStorage.getItem('hmrc-device-id')) {
        localStorage.setItem('hmrc-device-id', fraudHeaders['Gov-Client-Device-ID'])
      }

      const idToken = await auth.currentUser?.getIdToken()
      if (!idToken) {
        throw new Error('Please sign in again to test the HMRC connection.')
      }

      const requestBody = {
        companyId,
        siteId: siteId || null,
        subsiteId: subsiteId || null,
        userId: userId || undefined,
        fraudHeaders,
      }

      // Add timeout to fetch (30 seconds)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      let response
      try {
        response = await fetch(`${fnBase}/testHMRCAPIConnection`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        })
        clearTimeout(timeoutId)
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timed out after 30 seconds. Please check if the Firebase Functions emulator is running.')
        }
        throw fetchError
      }

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          const text = await response.text()
          throw new Error(`Server error (${response.status}): ${text}`)
        }

        const errorMessage = errorData.message || errorData.error || 'API connection test failed'
        throw new Error(errorMessage)
      }

      const result = await response.json()

      // Handle all response cases comprehensively
      if (result.success) {
        let successMessage = result.message || '✅ API connection test successful! The API call has been registered in HMRC Gateway.'
        
        // Add additional context
        if (result.note) {
          successMessage += ` ${result.note}`
        }
        if (result.registered) {
          successMessage += ' ✅ You can now check your HMRC Gateway dashboard - the API call should appear there.'
        }
        if (result.warning) {
          successMessage += ` ⚠️ ${result.warning}`
        }
        
        setSuccess(successMessage)
        
        // If requires reconnect, show additional message after delay
        if (result.requiresReconnect) {
          setTimeout(() => {
            setError('Your HMRC connection may have expired. Please reconnect to HMRC using the "Connect to HMRC" button.')
          }, 5000)
        }
      } else {
        let errorMessage = result.message || 'API connection test failed. Please check your HMRC settings and connection.'
        
        // Add additional context for errors
        if (result.retryRecommended) {
          errorMessage += ' Please try again in a few moments.'
        }
        if (result.requiresReconnect || result.requiresReauth) {
          errorMessage += ' You may need to reconnect to HMRC using the "Connect to HMRC" button.'
        }
        
        setError(errorMessage)
      }
    } catch (err: any) {
      setError(`Failed to test API connection: ${err.message}`)
    } finally {
      setTestingAPI(false)
    }
  }

  const handleSubmitTestEPS = async () => {
    if (!companyId) {
      setError('Company ID is missing. Please refresh the page and try again.')
      return
    }

    if (!hmrcSettings) {
      setError('HMRC settings not loaded. Please wait for settings to load or refresh the page.')
      return
    }

    // Validate required fields before making the call
    if (!hmrcSettings.employerPAYEReference?.trim()) {
      setError('PAYE Reference is required. Please add your PAYE Reference in HMRC settings.')
      return
    }

    if (!hmrcSettings.accountsOfficeReference?.trim()) {
      setError('Accounts Office Reference is required. Please add your Accounts Office Reference in HMRC settings.')
      return
    }

    if (oauthStatus === 'disconnected') {
      setError('HMRC OAuth not connected. Please connect to HMRC first using the "Connect to HMRC" button.')
      return
    }

    setSubmittingTestEPS(true)
    setError(null)
    setSuccess(null)

    try {
      // Get Firebase Functions base URL
      const fnBase = getFunctionsBaseUrl({
        projectId: APP_KEYS.firebase.projectId || 'stop-test-8025f',
        region: APP_KEYS.firebase.functionsRegion || 'us-central1',
      })

      // Generate fraud prevention headers from client
      const fraudHeaders: Record<string, string> = {
        'Gov-Client-Connection-Method': 'WEB_APP_VIA_SERVER',
        'Gov-Client-Device-ID': localStorage.getItem('hmrc-device-id') || `client-${Date.now()}`,
        'Gov-Client-User-IDs': userId ? `os=${userId}` : '',
        'Gov-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        'Gov-Client-Local-IPs': '',
        'Gov-Client-Screens': `${window.screen.width}x${window.screen.height}`,
        'Gov-Client-Window-Size': `${window.innerWidth}x${window.innerHeight}`,
        'Gov-Client-Browser-Plugins': '',
        'Gov-Client-Browser-JS-User-Agent': navigator.userAgent || '',
        'Gov-Client-Browser-Do-Not-Track': navigator.doNotTrack || 'false',
        'Gov-Client-Multi-Factor': ''
      }

      // Store device ID for future use
      if (!localStorage.getItem('hmrc-device-id')) {
        localStorage.setItem('hmrc-device-id', fraudHeaders['Gov-Client-Device-ID'])
      }

      const idToken = await auth.currentUser?.getIdToken()
      if (!idToken) {
        throw new Error('Please sign in again to submit the HMRC test EPS.')
      }

      const requestBody = {
        companyId,
        siteId: siteId || null,
        subsiteId: subsiteId || null,
        userId: userId || undefined,
        fraudHeaders,
      }

      // Add timeout to fetch (30 seconds)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      let response
      try {
        response = await fetch(`${fnBase}/testHMRCEPSSubmission`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        })
        clearTimeout(timeoutId)
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timed out after 30 seconds. Please check if the Firebase Functions emulator is running.')
        }
        throw fetchError
      }

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          const text = await response.text()
          throw new Error(`Server error (${response.status}): ${text}`)
        }

        const errorMessage = errorData.message || errorData.error || 'Test EPS submission failed'
        throw new Error(errorMessage)
      }

      const result = await response.json()

      // Handle response
      if (result.success && result.registered) {
        setSuccess(result.message || '✅ Test EPS submission successful! This API call has been registered in HMRC Developer Hub. You should now see it in your dashboard.')
      } else if (result.success && !result.registered) {
        setError(result.message || 'EPS submission was made but may not have been registered. Please try again.')
      } else if (result.requiresReconnect) {
        setError(result.message || 'Your HMRC connection has expired. Please reconnect using the "Connect to HMRC" button.')
      } else {
        setError(result.message || 'Test EPS submission failed. Please check your HMRC settings and connection.')
      }
    } catch (err: any) {
      setError(`Failed to submit test EPS: ${err.message}`)
    } finally {
      setSubmittingTestEPS(false)
    }
  }

  const handleInputChange = (field: keyof HMRCSettings, value: any) => {
    setHmrcSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Box sx={{ p: embedded ? 0 : 3 }}>
      {!embedded && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            HMRC Integration Settings
          </Typography>
          <Button
            variant="outlined"
            startIcon={<HelpIcon />}
            onClick={() => setHelpDialogOpen(true)}
            sx={{ ml: 2 }}
          >
            Connection Guide
          </Button>
        </Box>
      )}

      {/* Configuration Level Selector */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Configuration Level" />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Choose where to store HMRC settings. Settings are checked in this order: Subsite → Site → Company
              </Alert>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Settings Level</InputLabel>
                <Select
                  value={settingsLevel}
                  onChange={(e) => setSettingsLevel(e.target.value as "company" | "site" | "subsite")}
                  label="Settings Level"
                >
                  <MenuItem value="subsite" disabled={!subsiteId || !siteId}>
                    Subsite {subsiteId ? `(${companyState.selectedSubsiteName || subsiteId})` : '(Not Selected)'}
                  </MenuItem>
                  <MenuItem value="site" disabled={!siteId}>
                    Site {siteId ? `(${companyState.selectedSiteName || siteId})` : '(Not Selected)'}
                  </MenuItem>
                  <MenuItem value="company">
                    Company {companyId ? `(${companyState.companyName || companyId})` : ''}
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {settingsFoundAt && (
              <Grid item xs={12} sm={6}>
                <Alert severity="success" sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircleIcon sx={{ mr: 1 }} />
                  Settings found at: <strong>{settingsFoundAt}</strong> level
                </Alert>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* OAuth Connection Status */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title="HMRC Connection"
          avatar={<VpnKeyIcon color={oauthStatus === 'connected' ? 'success' : 'disabled'} />}
          action={
            oauthStatus === 'connected' ? (
              <Chip icon={<CheckCircleIcon />} label="Connected" color="success" size="small" />
            ) : oauthStatus === 'expired' ? (
              <Chip icon={<ErrorIcon />} label="Expired" color="warning" size="small" />
            ) : (
              <Chip label="Not Connected" color="default" size="small" />
            )
          }
        />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Alert severity={oauthStatus === 'connected' ? 'success' : 'info'} sx={{ mb: 2 }}>
                {oauthStatus === 'connected' 
                  ? 'Connected to HMRC. Your payroll can be automatically submitted.'
                  : oauthStatus === 'expired'
                  ? 'Your HMRC connection has expired. Click "Refresh Token" to reconnect.'
                  : 'Connect to HMRC to enable automatic RTI submissions. You only need to do this once.'}
              </Alert>
              {oauthStatus === 'connected' && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <strong>Next Step:</strong> Click "Test API Connection" below to make your first API call. This registers your integration in HMRC Gateway and is required to complete the verification process.
                </Alert>
              )}
              {connectionMeta && !connectionMeta.hasClientSecret && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  No HMRC client secret is stored in the secure secret vault for this configuration level. OAuth can only complete if your deployment has a server-side HMRC client secret configured.
                </Alert>
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                variant="contained"
                startIcon={<VpnKeyIcon />}
                onClick={handleConnectHMRC}
                disabled={oauthConnecting || oauthStatus === 'connected'}
                fullWidth
              >
                {oauthStatus === 'connected' ? 'Connected' : 'Connect to HMRC'}
              </Button>
            </Grid>
            {oauthStatus === 'expired' && (
              <Grid item xs={12} sm={6}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleRefreshToken}
                  disabled={oauthConnecting}
                  fullWidth
                >
                  Refresh Token
                </Button>
              </Grid>
            )}
            {oauthStatus === 'connected' && (
              <>
                <Grid item xs={12} sm={6}>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<CheckCircleIcon />}
                    onClick={handleTestAPIConnection}
                    disabled={testingAPI || submittingTestEPS}
                    fullWidth
                  >
                    {testingAPI ? 'Testing...' : 'Test API Connection'}
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<CheckCircleIcon />}
                    onClick={handleSubmitTestEPS}
                    disabled={testingAPI || submittingTestEPS}
                    fullWidth
                  >
                    {submittingTestEPS ? 'Submitting...' : 'Submit Test EPS'}
                  </Button>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Submits a minimal EPS to register an API call in HMRC Developer Hub
                  </Typography>
                </Grid>
              </>
            )}
            {(hmrcSettings?.lastHMRCAuthDate || connectionMeta?.tokenExpiry) && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  {hmrcSettings?.lastHMRCAuthDate
                    ? `Last connected: ${new Date(hmrcSettings.lastHMRCAuthDate).toLocaleString()}`
                    : connectionMeta?.tokenExpiry
                    ? `Token expires: ${new Date(connectionMeta.tokenExpiry).toLocaleString()}`
                    : ''}
                </Typography>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Employer Identification */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Employer Identification" />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Tooltip
                title="Your PAYE Reference is found on HMRC correspondence, payslips, or in your HMRC online account. Format: ###/AB###### (e.g., 123/AB45678)"
                arrow
              >
                <TextField
                  fullWidth
                  label="PAYE Reference"
                  value={hmrcSettings?.employerPAYEReference || ""}
                  onChange={(e) => {
                    const value = e.target.value
                    handleInputChange('employerPAYEReference', value)
                    // Auto-extract office number
                    const officeNumber = value.split('/')[0] || ""
                    handleInputChange('hmrcOfficeNumber', officeNumber)
                  }}
                  placeholder="123/AB45678"
                  helperText="Format: ###/AB###### (e.g., 123/AB45678)"
                  required
                  InputProps={{
                    endAdornment: (
                      <IconButton size="small" onClick={() => setHelpDialogOpen(true)}>
                        <HelpIcon fontSize="small" />
                      </IconButton>
                    )
                  }}
                />
              </Tooltip>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Tooltip
                title="Your Accounts Office Reference is found on HMRC correspondence or in your HMRC online account. Format: ###PA######## (e.g., 123PA00012345)"
                arrow
              >
                <TextField
                  fullWidth
                  label="Accounts Office Reference"
                  value={hmrcSettings?.accountsOfficeReference || ""}
                  onChange={(e) => handleInputChange('accountsOfficeReference', e.target.value)}
                  placeholder="123PA00012345"
                  helperText="Format: ###PA######## (e.g., 123PA00012345)"
                  required
                  InputProps={{
                    endAdornment: (
                      <IconButton size="small" onClick={() => setHelpDialogOpen(true)}>
                        <HelpIcon fontSize="small" />
                      </IconButton>
                    )
                  }}
                />
              </Tooltip>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Corporation Tax Reference (Optional)"
                value={hmrcSettings?.corporationTaxReference || ""}
                onChange={(e) => handleInputChange('corporationTaxReference', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="VAT Registration Number (Optional)"
                value={hmrcSettings?.vatRegistrationNumber || ""}
                onChange={(e) => handleInputChange('vatRegistrationNumber', e.target.value)}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* RTI Submission Settings */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="RTI Submission Settings" />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={hmrcSettings?.autoSubmitFPS || false}
                    onChange={(e) => handleInputChange('autoSubmitFPS', e.target.checked)}
                  />
                }
                label="Automatically submit FPS after payroll approval"
              />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4, mt: 0.5 }}>
                When enabled, payroll will be automatically submitted to HMRC when approved
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={hmrcSettings?.requireFPSApproval || true}
                    onChange={(e) => handleInputChange('requireFPSApproval', e.target.checked)}
                  />
                }
                label="Require manual approval before FPS submission"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="FPS Submission Lead Time (Days)"
                value={hmrcSettings?.fpsSubmissionLeadTime || 0}
                onChange={(e) => handleInputChange('fpsSubmissionLeadTime', parseInt(e.target.value) || 0)}
                helperText="Days before payment date to submit FPS"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Environment</InputLabel>
                <Select
                  value={hmrcSettings?.hmrcEnvironment || "sandbox"}
                  onChange={(e) => handleInputChange('hmrcEnvironment', e.target.value)}
                  label="Environment"
                >
                  <MenuItem value="sandbox">Sandbox (Testing)</MenuItem>
                  <MenuItem value="production">Production (Live)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Employment Allowance */}
      <Accordion sx={{ mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Employment Allowance</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={hmrcSettings?.claimsEmploymentAllowance || false}
                    onChange={(e) => handleInputChange('claimsEmploymentAllowance', e.target.checked)}
                  />
                }
                label="Claim Employment Allowance"
              />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4, mt: 0.5 }}>
                You can claim up to £5,000 per year to reduce your employer National Insurance contributions
              </Typography>
            </Grid>
            {hmrcSettings?.claimsEmploymentAllowance && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Employment Allowance Amount"
                    value={hmrcSettings?.employmentAllowanceAmount || 5000}
                    onChange={(e) => handleInputChange('employmentAllowanceAmount', parseFloat(e.target.value) || 5000)}
                    helperText="Maximum: £5,000 per year"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Amount Used This Year"
                    value={hmrcSettings?.employmentAllowanceUsed || 0}
                    onChange={(e) => handleInputChange('employmentAllowanceUsed', parseFloat(e.target.value) || 0)}
                    helperText="Amount already used in current tax year"
                  />
                </Grid>
              </>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Apprenticeship Levy */}
      <Accordion sx={{ mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Apprenticeship Levy</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={hmrcSettings?.isApprenticeshipLevyPayer || false}
                    onChange={(e) => handleInputChange('isApprenticeshipLevyPayer', e.target.checked)}
                  />
                }
                label="Apprenticeship Levy Payer"
              />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4, mt: 0.5 }}>
                Required if your annual payroll is over £3 million
              </Typography>
            </Grid>
            {hmrcSettings?.isApprenticeshipLevyPayer && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Levy Allowance"
                    value={hmrcSettings?.apprenticeshipLevyAllowance || 15000}
                    onChange={(e) => handleInputChange('apprenticeshipLevyAllowance', parseFloat(e.target.value) || 15000)}
                    helperText="Standard allowance: £15,000"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Levy Rate"
                    value={((hmrcSettings?.apprenticeshipLevyRate || 0.005) * 100).toFixed(2)}
                    onChange={(e) => handleInputChange('apprenticeshipLevyRate', (parseFloat(e.target.value) || 0) / 100)}
                    helperText="Standard rate: 0.5%"
                    InputProps={{
                      endAdornment: <Typography variant="body2">%</Typography>
                    }}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Notifications */}
      <Accordion sx={{ mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Notifications</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={hmrcSettings?.notifyBeforeFPSDeadline || false}
                    onChange={(e) => handleInputChange('notifyBeforeFPSDeadline', e.target.checked)}
                  />
                }
                label="Notify before FPS deadline"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={hmrcSettings?.notifyBeforePaymentDeadline || false}
                    onChange={(e) => handleInputChange('notifyBeforePaymentDeadline', e.target.checked)}
                  />
                }
                label="Notify before HMRC payment deadline"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Notification Lead Days"
                value={hmrcSettings?.notificationLeadDays || 3}
                onChange={(e) => handleInputChange('notificationLeadDays', parseInt(e.target.value) || 3)}
                helperText="Days in advance to send notifications"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="email"
                label="Notification Email"
                value={hmrcSettings?.notificationEmail || ""}
                onChange={(e) => handleInputChange('notificationEmail', e.target.value)}
                helperText="Email address for payroll notifications"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Save Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
        <Button
          variant="outlined"
          onClick={loadSettings}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          Save Settings
        </Button>
      </Box>

      {/* Error/Success Messages */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>

      {/* Connection Guide Help Dialog */}
      <Dialog
        open={helpDialogOpen}
        onClose={() => setHelpDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: themeConfig.brandColors.navy, color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
          <ArticleIcon />
          HMRC API Connection Guide
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Follow these simple steps to connect your HMRC account. The entire process takes less than 5 minutes!
          </Alert>

          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
            <CheckCircleIcon color="success" />
            Step 1: Choose Configuration Level
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, ml: 4 }}>
            Select where to store your HMRC settings (Company, Site, or Subsite). Settings are checked in this order: Subsite → Site → Company.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
            <CheckCircleIcon color="success" />
            Step 2: Enter Your HMRC Details
          </Typography>
          <List sx={{ ml: 4, mb: 2 }}>
            <ListItem>
              <ListItemIcon>
                <Typography variant="body2" fontWeight="bold">1.</Typography>
              </ListItemIcon>
              <ListItemText
                primary="PAYE Reference"
                secondary="Format: ###/AB###### (e.g., 123/AB45678). Found on HMRC correspondence or payslips."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Typography variant="body2" fontWeight="bold">2.</Typography>
              </ListItemIcon>
              <ListItemText
                primary="Accounts Office Reference"
                secondary="Format: ###PA######## (e.g., 123PA00012345). Found on HMRC correspondence."
              />
            </ListItem>
          </List>

          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
            <CheckCircleIcon color="success" />
            Step 3: Save Settings
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, ml: 4 }}>
            Click "Save Settings" to store your HMRC details. Wait for the success message before proceeding.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
            <CheckCircleIcon color="success" />
            Step 4: Connect to HMRC
          </Typography>
          <List sx={{ ml: 4, mb: 2 }}>
            <ListItem>
              <ListItemIcon>
                <Typography variant="body2" fontWeight="bold">1.</Typography>
              </ListItemIcon>
              <ListItemText
                primary="Click 'Connect to HMRC'"
                secondary="This will redirect you to HMRC's authorization page."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Typography variant="body2" fontWeight="bold">2.</Typography>
              </ListItemIcon>
              <ListItemText
                primary="Log in with Government Gateway"
                secondary="Use your Government Gateway credentials (the same account you use for HMRC online services)."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Typography variant="body2" fontWeight="bold">3.</Typography>
              </ListItemIcon>
              <ListItemText
                primary="Authorize the Application"
                secondary="Review the permissions and click 'Authorize' to grant access."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Typography variant="body2" fontWeight="bold">4.</Typography>
              </ListItemIcon>
              <ListItemText
                primary="You're Done!"
                secondary="You'll be redirected back and see 'Successfully Connected!' message."
              />
            </ListItem>
          </List>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            📋 What You'll Need
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="PAYE Reference (format: 123/AB45678)" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Accounts Office Reference (format: 123PA00012345)" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Government Gateway account access" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Admin access to HR settings" />
            </ListItem>
          </List>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            ⚠️ Common Issues
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="'HMRC settings not configured'"
                secondary="Make sure you've saved your settings before connecting. Click 'Save Settings' first."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="'Authorization failed'"
                secondary="Ensure you're using the correct Government Gateway account with access to your PAYE scheme."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="'Token expired'"
                secondary="Click 'Refresh Token' to automatically renew your connection. No need to re-authorize."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="'PAYE Reference format incorrect'"
                secondary="Check the format: ###/AB###### (e.g., 123/AB45678). No spaces allowed."
              />
            </ListItem>
          </List>

          <Alert severity="success" sx={{ mt: 3 }}>
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              ✅ Success Checklist
            </Typography>
            <Typography variant="body2" component="div">
              • Selected configuration level<br />
              • Entered PAYE Reference<br />
              • Entered Accounts Office Reference<br />
              • Saved settings<br />
              • Connected to HMRC<br />
              • Authorized the application<br />
              • See "Connected" status
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpDialogOpen(false)}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setHelpDialogOpen(false)
              // Scroll to connection section
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          >
            Got It - Let's Connect!
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default HMRCSettingsTab

