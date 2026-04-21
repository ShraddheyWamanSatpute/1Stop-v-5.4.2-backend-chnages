import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { alpha } from "@mui/material/styles"
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material"
import {
  AccountBalance as FinanceIcon,
  Assessment as AnalyticsIcon,
  Business as CompanyIcon,
  CalendarMonth as BookingsIcon,
  Dashboard as DashboardIcon,
  Inventory as StockIcon,
  LocalShipping as SupplyIcon,
  Message as MessengerIcon,
  People as HRIcon,
  PointOfSale as POSIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material"
import CollapsibleTabHeader from "../../app/frontend/components/reusable/CollapsibleTabHeader"
import { APP_KEYS, getFunctionsFetchBaseUrl } from "../backend/config/keys"
import { themeConfig } from "../../app/backend/context/AppTheme"
import { auth } from "../backend/services/Firebase"
import { AdminPageShell, AdminSectionCard } from "./shared/AdminPageShell"

type ScopeValue = "items" | "orders-api" | "financial-api" | "offline_access"
type CompanyRow = { id: string; name: string }
type SiteRow = { id: string; name: string }
type SubsiteRow = { id: string; name: string }
type PreviewRow = {
  businesses?: Array<{ businessLocationId: number; businessName: string; businessLocationName: string }>
  selectedBusinessLocationId?: number | null
  selectedBusinessLocationName?: string | null
  itemCount?: number
  financialCount?: number
}
type StatusRow = {
  settingsPath?: string
  settings?: any
  audit?: Array<any>
}

const DEFAULT_SCOPES: ScopeValue[] = ["items", "orders-api", "financial-api", "offline_access"]

/** Must match the HTTPS function name `oauthCallbackLightspeedK` (Lightspeed developer portal redirect URL). */
const LIGHTSPEED_K_OAUTH_CALLBACK_URL = `https://${APP_KEYS.firebase.functionsRegion || "us-central1"}-${APP_KEYS.firebase.projectId}.cloudfunctions.net/oauthCallbackLightspeedK`

async function readJson(resp: Response) {
  const text = await resp.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Unexpected response from ${resp.url}`)
  }
}

async function authedFetch(
  url: string,
  options: RequestInit = {}
) {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error("Not signed in")
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  }
  if (options.body) {
    headers["Content-Type"] = "application/json"
  }
  const resp = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...headers,
    },
  })
  const data = await readJson(resp).catch(() => null)
  if (!resp.ok) throw new Error(data?.error || `Request failed (${resp.status})`)
  return data
}

function IntegrationModulePlaceholder({ title }: { title: string }) {
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 720 }}>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Admin integrations for this app area are not configured yet. Use the Stock tab for Lightspeed Restaurant (K-Series).
      </Typography>
    </Box>
  )
}

export default function AdminIntegrations() {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(0)
  const [isTabsExpanded, setIsTabsExpanded] = useState(true)
  const lastRouteSyncPathRef = useRef("")
  const suppressRouteSyncOnceRef = useRef("")
  const lsFormUid = React.useId().replace(/:/g, "")
  const fnBase = getFunctionsFetchBaseUrl({
    projectId: APP_KEYS.firebase.projectId,
    region: APP_KEYS.firebase.functionsRegion,
  })
  const isLocalProxy = fnBase.startsWith("/api/functions")

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const [companies, setCompanies] = useState<CompanyRow[]>([])
  const [sites, setSites] = useState<SiteRow[]>([])
  const [subsites, setSubsites] = useState<SubsiteRow[]>([])
  const [companyId, setCompanyId] = useState("")
  const [siteId, setSiteId] = useState("default")
  const [subsiteId, setSubsiteId] = useState("default")

  const [env, setEnv] = useState<"production" | "trial">("production")
  const [clientId, setClientId] = useState("")
  const [clientSecret, setClientSecret] = useState("")
  const [scopes, setScopes] = useState<ScopeValue[]>(DEFAULT_SCOPES)
  const [financialFrom, setFinancialFrom] = useState("")
  const [financialTo, setFinancialTo] = useState("")
  const [businessLocationId, setBusinessLocationId] = useState("")

  const [status, setStatus] = useState<StatusRow | null>(null)
  const [preview, setPreview] = useState<PreviewRow | null>(null)

  const scope = useMemo(
    () => ({ company_id: companyId, site_id: siteId || "default", subsite_id: subsiteId || "default" }),
    [companyId, siteId, subsiteId]
  )

  const canLoad = Boolean(companyId)
  const canSaveCredentials = Boolean(companyId && clientId && clientSecret)

  useEffect(() => {
    const now = new Date()
    const from = new Date(now)
    from.setDate(from.getDate() - 30)
    const fmt = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    setFinancialFrom(fmt(from))
    setFinancialTo(fmt(now))
  }, [])

  useEffect(() => {
    if (isLocalProxy) {
      setError("Admin Integrations remote endpoints are not available through the shared localhost dev shell yet.")
      setCompanies([])
      return
    }
    const loadCompanies = async () => {
      try {
        setBusy("companies")
        const data = await authedFetch(`${fnBase}/adminIntegrationsListCompanies`)
        setCompanies(Array.isArray(data?.companies) ? data.companies : [])
      } catch (e: any) {
        setError(e?.message || "Failed to load companies")
      } finally {
        setBusy(null)
      }
    }
    loadCompanies()
  }, [fnBase, isLocalProxy])

  useEffect(() => {
    if (!companyId) {
      setSites([])
      setSiteId("default")
      return
    }
    if (isLocalProxy) return
    const loadSites = async () => {
      try {
        setBusy("sites")
        const data = await authedFetch(`${fnBase}/adminIntegrationsListSites?company_id=${encodeURIComponent(companyId)}`)
        setSites(Array.isArray(data?.sites) ? data.sites : [])
        setSiteId("default")
      } catch (e: any) {
        setError(e?.message || "Failed to load sites")
      } finally {
        setBusy(null)
      }
    }
    loadSites()
  }, [companyId, fnBase, isLocalProxy])

  useEffect(() => {
    if (!companyId || siteId === "default") {
      setSubsites([])
      setSubsiteId("default")
      return
    }
    if (isLocalProxy) return
    const loadSubsites = async () => {
      try {
        setBusy("subsites")
        const data = await authedFetch(
          `${fnBase}/adminIntegrationsListSubsites?company_id=${encodeURIComponent(companyId)}&site_id=${encodeURIComponent(siteId)}`
        )
        setSubsites(Array.isArray(data?.subsites) ? data.subsites : [])
        setSubsiteId("default")
      } catch (e: any) {
        setError(e?.message || "Failed to load subsites")
      } finally {
        setBusy(null)
      }
    }
    loadSubsites()
  }, [companyId, siteId, fnBase, isLocalProxy])

  const loadStatus = async () => {
    if (!canLoad || isLocalProxy) return
    try {
      setBusy("status")
      setError(null)
      const data = await authedFetch(
        `${fnBase}/adminIntegrationsKSeriesStatus?company_id=${encodeURIComponent(scope.company_id)}&site_id=${encodeURIComponent(scope.site_id)}&subsite_id=${encodeURIComponent(scope.subsite_id)}`
      )
      setStatus(data)
      const settings = data?.settings || {}
      setEnv(settings.env === "trial" ? "trial" : "production")
      setClientId(String(settings.clientId || ""))
      setBusinessLocationId(settings.businessLocationId ? String(settings.businessLocationId) : "")
      const rawScopes = String(settings.scope || "").trim()
      const allowed: ScopeValue[] = ["items", "orders-api", "financial-api", "offline_access"]
      const parsed = rawScopes.split(/\s+/g).filter((x): x is ScopeValue => allowed.includes(x as ScopeValue))
      setScopes(parsed.length ? parsed : DEFAULT_SCOPES)
    } catch (e: any) {
      setError(e?.message || "Failed to load status")
    } finally {
      setBusy(null)
    }
  }

  const loadPreview = async () => {
    if (!canLoad || isLocalProxy) return
    try {
      setBusy("preview")
      setError(null)
      const data = await authedFetch(
        `${fnBase}/adminIntegrationsKSeriesPreview?company_id=${encodeURIComponent(scope.company_id)}&site_id=${encodeURIComponent(scope.site_id)}&subsite_id=${encodeURIComponent(scope.subsite_id)}&financial_from=${encodeURIComponent(new Date(financialFrom).toISOString())}&financial_to=${encodeURIComponent(new Date(financialTo).toISOString())}${businessLocationId ? `&business_location_id=${encodeURIComponent(businessLocationId)}` : ""}`
      )
      setPreview(data)
      if (data?.selectedBusinessLocationId) {
        setBusinessLocationId(String(data.selectedBusinessLocationId))
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load preview")
    } finally {
      setBusy(null)
    }
  }

  const postAction = async (endpoint: string, body: Record<string, unknown>, message: string) => {
    if (isLocalProxy) {
      setError("Admin Integrations actions are disabled in localhost shared-shell dev mode.")
      return null
    }
    try {
      setBusy(endpoint)
      setError(null)
      setSuccess(null)
      const data = await authedFetch(`${fnBase}/${endpoint}`, {
        method: "POST",
        body: JSON.stringify(body),
      })
      setSuccess(data?.error ? String(data.error) : message)
      return data
    } catch (e: any) {
      setError(e?.message || "Action failed")
      return null
    } finally {
      setBusy(null)
    }
  }

  const cleanSearch = useMemo(() => {
    const params = new URLSearchParams(location.search || "")
    params.delete("tab")
    const s = params.toString()
    return s ? `?${s}` : ""
  }, [location.search])

  const canonicalSegmentForSlug = useCallback((slug: string) => {
    const raw = String(slug || "").trim()
    if (!raw) return ""
    return raw.charAt(0).toUpperCase() + raw.slice(1)
  }, [])

  const tabs = useMemo(
    () => [
      { id: 0, label: "Dashboard", slug: "dashboard", icon: <DashboardIcon /> },
      { id: 1, label: "Company", slug: "company", icon: <CompanyIcon /> },
      { id: 2, label: "Stock", slug: "stock", icon: <StockIcon /> },
      { id: 3, label: "HR", slug: "hr", icon: <HRIcon /> },
      { id: 4, label: "Bookings", slug: "bookings", icon: <BookingsIcon /> },
      { id: 5, label: "POS", slug: "pos", icon: <POSIcon /> },
      { id: 6, label: "Finance", slug: "finance", icon: <FinanceIcon /> },
      { id: 7, label: "Messenger", slug: "messenger", icon: <MessengerIcon /> },
      { id: 8, label: "Supply", slug: "supply", icon: <SupplyIcon /> },
      { id: 9, label: "Analytics", slug: "analytics", icon: <AnalyticsIcon /> },
      { id: 10, label: "Settings", slug: "settings", icon: <SettingsIcon /> },
    ],
    [],
  )

  useEffect(() => {
    if (activeTab >= tabs.length) {
      setActiveTab(0)
    }
  }, [tabs.length, activeTab])

  useEffect(() => {
    if (!tabs.length) {
      return
    }

    const pathWithoutTrailingSlash = location.pathname.replace(/\/+$/, "")
    const pathLower = pathWithoutTrailingSlash.toLowerCase()
    const routeKey = `${pathLower}${location.search || ""}`.toLowerCase()

    const isSuppressed = suppressRouteSyncOnceRef.current === routeKey
    if (isSuppressed) {
      suppressRouteSyncOnceRef.current = ""
    }

    if (lastRouteSyncPathRef.current === routeKey) {
      return
    }
    lastRouteSyncPathRef.current = routeKey

    const parts = pathWithoutTrailingSlash.split("/").filter(Boolean)
    const idx = parts.findIndex((p) => p.toLowerCase() === "integrations")
    const tabFromPath = idx !== -1 ? String(parts[idx + 1] || "") : ""
    const tabNorm = tabFromPath.toLowerCase().replace(/-/g, "")

    if (tabFromPath) {
      const desiredSegment = canonicalSegmentForSlug(tabFromPath)
      const desiredPath = idx !== -1 ? `/Integrations/${desiredSegment}` : ""
      const desiredKey = `${desiredPath}${cleanSearch}`.toLowerCase()
      const currentKey = `${pathWithoutTrailingSlash}${location.search || ""}`.toLowerCase()
      if (desiredPath && currentKey !== desiredKey && tabFromPath !== desiredSegment) {
        suppressRouteSyncOnceRef.current = desiredKey
        navigate(`${desiredPath}${cleanSearch}`, { replace: true })
        return
      }
    }

    if (tabFromPath) {
      const matchedIndex = tabs.findIndex(
        (tab) => tab.slug.toLowerCase() === tabNorm || tab.slug.toLowerCase() === tabFromPath.toLowerCase(),
      )
      if (matchedIndex !== -1 && matchedIndex !== activeTab) {
        setActiveTab(matchedIndex)
        return
      }
    }

    if (!tabFromPath) {
      const defaultPath = `/Integrations/${canonicalSegmentForSlug(tabs[0].slug)}${cleanSearch}`
      const defaultKey = defaultPath.toLowerCase()
      if (!isSuppressed && routeKey !== defaultKey) {
        suppressRouteSyncOnceRef.current = defaultKey
        navigate(defaultPath, { replace: true })
      }
      if (activeTab !== 0) setActiveTab(0)
    }
  }, [activeTab, canonicalSegmentForSlug, cleanSearch, location.pathname, location.search, navigate, tabs])

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
    const selectedTab = tabs[newValue]
    if (!selectedTab?.slug) {
      return
    }
    const targetPath = `/Integrations/${canonicalSegmentForSlug(selectedTab.slug)}${cleanSearch}`
    const currentPath = location.pathname.replace(/\/+$/, "")
    const currentKey = `${currentPath}${location.search || ""}`.toLowerCase()
    const targetKey = targetPath.toLowerCase()
    if (currentKey !== targetKey) {
      suppressRouteSyncOnceRef.current = targetKey
      navigate(targetPath)
    }
  }

  return (
    <AdminPageShell title="Integrations" sx={{ height: "100%" }}>
      <AdminSectionCard flush sx={{ flex: 1 }}>
        <CollapsibleTabHeader
          layout="dataHeaderGap"
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isExpanded={isTabsExpanded}
          onToggleExpanded={() => setIsTabsExpanded((v) => !v)}
        />

        <Box
          sx={{
            flexGrow: 1,
            overflow: "auto",
            width: "100%",
            minHeight: 0,
            p: { xs: 2, md: 2.5 },
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {error ? (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          ) : null}
          {success ? (
            <Alert severity="success" onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          ) : null}

          {tabs.map((tab, index) => (
            <Box key={tab.slug} sx={{ display: index === activeTab ? "block" : "none", height: "100%" }}>
              {tab.slug === "stock" ? (
                <>
                  <Box
                    component="form"
                    id={`admin-ls-kseries-${lsFormUid}`}
                    autoComplete="off"
                    noValidate
                    onSubmit={(e) => e.preventDefault()}
                    sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.35 }}>
                      Lightspeed Restaurant (K-Series): credentials, preview scope, and sync actions for the selected company scope.
                    </Typography>

                    <Grid container spacing={1}>
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth size="small" disabled={busy === "companies"}>
                          <InputLabel>Company</InputLabel>
                          <Select
                            value={companyId}
                            label="Company"
                            onChange={(e) => setCompanyId(String(e.target.value || ""))}
                            inputProps={{ autoComplete: "off", id: `ls_company_${lsFormUid}` }}
                          >
                            <MenuItem value="">
                              <em>Select...</em>
                            </MenuItem>
                            {companies.map((company) => (
                              <MenuItem key={company.id} value={company.id}>
                                {company.name} ({company.id})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth size="small" disabled={!companyId || busy === "sites"}>
                          <InputLabel>Site</InputLabel>
                          <Select
                            value={siteId}
                            label="Site"
                            onChange={(e) => setSiteId(String(e.target.value || "default"))}
                            inputProps={{ autoComplete: "off", id: `ls_site_${lsFormUid}` }}
                          >
                            <MenuItem value="default">Company default</MenuItem>
                            {sites.map((site) => (
                              <MenuItem key={site.id} value={site.id}>
                                {site.name} ({site.id})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth size="small" disabled={!companyId || siteId === "default" || busy === "subsites"}>
                          <InputLabel>Subsite</InputLabel>
                          <Select
                            value={subsiteId}
                            label="Subsite"
                            onChange={(e) => setSubsiteId(String(e.target.value || "default"))}
                            inputProps={{ autoComplete: "off", id: `ls_subsite_${lsFormUid}` }}
                          >
                            <MenuItem value="default">Site default</MenuItem>
                            {subsites.map((subsite) => (
                              <MenuItem key={subsite.id} value={subsite.id}>
                                {subsite.name} ({subsite.id})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>

                    <AdminSectionCard
                      title="Lightspeed Restaurant (K-Series)"
                      actions={
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={busy === "status" ? <CircularProgress size={16} /> : <RefreshIcon />}
                          onClick={loadStatus}
                          disabled={!canLoad}
                        >
                          Refresh
                        </Button>
                      }
                      contentSx={{ px: 1.5, py: 1.25 }}
                      sx={{
                        mt: 0.5,
                        "& > .MuiStack-root": { py: 1, px: 1.5 },
                      }}
                    >
                      <Grid container spacing={1}>
                        <Grid item xs={12} sm={6} md={2}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Environment</InputLabel>
                            <Select
                              value={env}
                              label="Environment"
                              onChange={(e) => setEnv(e.target.value as "production" | "trial")}
                              inputProps={{ autoComplete: "off", id: `ls_env_${lsFormUid}` }}
                            >
                              <MenuItem value="production">Production</MenuItem>
                              <MenuItem value="trial">Trial</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                          <TextField
                            size="small"
                            fullWidth
                            label="Client ID"
                            name={`ls_oauth_client_id_${lsFormUid}`}
                            id={`ls_oauth_client_id_${lsFormUid}`}
                            value={clientId}
                            onChange={(e) => setClientId(e.target.value)}
                            autoComplete="off"
                            inputProps={{
                              autoComplete: "off",
                              "data-lpignore": "true",
                              "data-1p-ignore": "true",
                              "data-bwignore": "true",
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={8}>
                          <Alert severity="info" sx={{ py: 0.75 }}>
                            <Typography variant="caption" component="div" sx={{ wordBreak: "break-all" }}>
                              Lightspeed redirect URI (register exactly):{" "}
                              <Box component="span" sx={{ fontFamily: "monospace" }}>
                                {LIGHTSPEED_K_OAUTH_CALLBACK_URL}
                              </Box>
                            </Typography>
                          </Alert>
                        </Grid>
                        <Grid item xs={12} md={12}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Scopes</InputLabel>
                            <Select
                              multiple
                              value={scopes}
                              label="Scopes"
                              onChange={(e) =>
                                setScopes(
                                  (typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value) as ScopeValue[],
                                )
                              }
                              inputProps={{ autoComplete: "off", id: `ls_scopes_${lsFormUid}` }}
                              renderValue={(selected) => (selected as string[]).join(" ")}
                            >
                              {DEFAULT_SCOPES.map((s) => (
                                <MenuItem key={s} value={s}>
                                  {s}
                                </MenuItem>
                              ))}
                            </Select>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                              Use all four for catalog, orders, financial/sales, and token refresh.
                            </Typography>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            size="small"
                            fullWidth
                            type="password"
                            label="Client Secret"
                            name={`ls_oauth_client_secret_${lsFormUid}`}
                            id={`ls_oauth_client_secret_${lsFormUid}`}
                            value={clientSecret}
                            onChange={(e) => setClientSecret(e.target.value)}
                            helperText="Required when saving credentials."
                            autoComplete="new-password"
                            inputProps={{
                              autoComplete: "new-password",
                              "data-lpignore": "true",
                              "data-1p-ignore": "true",
                              "data-bwignore": "true",
                            }}
                          />
                        </Grid>
                      </Grid>

                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1.25 }} flexWrap="wrap" useFlexGap>
                        <Button
                          size="small"
                          variant="contained"
                          disabled={!canSaveCredentials}
                          onClick={() =>
                            postAction(
                              "adminIntegrationsKSeriesSaveCredentials",
                              {
                                ...scope,
                                env,
                                client_id: clientId,
                                client_secret: clientSecret,
                                scope: scopes.join(" "),
                              },
                              "Credentials saved",
                            )
                          }
                        >
                          Save credentials
                        </Button>
                        <Button size="small" variant="outlined" disabled={!canLoad} onClick={loadPreview}>
                          {busy === "preview" ? "Loading..." : "Load full data"}
                        </Button>
                      </Stack>

                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.25,
                          mt: 1.25,
                          borderColor: alpha(themeConfig.brandColors.navy, 0.12),
                          borderRadius: 1.5,
                        }}
                      >
                        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.75 }}>
                          Full data / sync
                        </Typography>
                        <Grid container spacing={1}>
                          <Grid item xs={12} sm={6} md={4}>
                            <TextField
                              size="small"
                              fullWidth
                              type="datetime-local"
                              label="Financial from"
                              name={`ls_fin_from_${lsFormUid}`}
                              value={financialFrom}
                              onChange={(e) => setFinancialFrom(e.target.value)}
                              InputLabelProps={{ shrink: true }}
                              autoComplete="off"
                              inputProps={{ autoComplete: "off", "data-lpignore": "true" }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6} md={4}>
                            <TextField
                              size="small"
                              fullWidth
                              type="datetime-local"
                              label="Financial to"
                              name={`ls_fin_to_${lsFormUid}`}
                              value={financialTo}
                              onChange={(e) => setFinancialTo(e.target.value)}
                              InputLabelProps={{ shrink: true }}
                              autoComplete="off"
                              inputProps={{ autoComplete: "off", "data-lpignore": "true" }}
                            />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <FormControl fullWidth size="small" disabled={!preview?.businesses?.length}>
                              <InputLabel>Business location</InputLabel>
                              <Select
                                value={businessLocationId}
                                label="Business location"
                                onChange={(e) => setBusinessLocationId(String(e.target.value || ""))}
                                inputProps={{ autoComplete: "off", id: `ls_bizloc_${lsFormUid}` }}
                              >
                                <MenuItem value="">
                                  <em>Select...</em>
                                </MenuItem>
                                {(preview?.businesses || []).map((row) => (
                                  <MenuItem key={row.businessLocationId} value={String(row.businessLocationId)}>
                                    {row.businessName} / {row.businessLocationName}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                        </Grid>

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1.25, mb: 1 }} flexWrap="wrap" useFlexGap>
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={!businessLocationId}
                            onClick={() =>
                              postAction(
                                "adminIntegrationsKSeriesSaveBusinessLocation",
                                { ...scope, business_location_id: businessLocationId },
                                "Business location saved",
                              )
                            }
                          >
                            Save location
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            disabled={!businessLocationId}
                            onClick={() =>
                              postAction("adminIntegrationsKSeriesSyncItems", { ...scope, business_location_id: businessLocationId }, "Item sync started")
                            }
                          >
                            Sync items to stock
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="secondary"
                            disabled={!businessLocationId}
                            onClick={() =>
                              postAction(
                                "adminIntegrationsKSeriesSyncFinancials",
                                {
                                  ...scope,
                                  business_location_id: businessLocationId,
                                  financial_from: new Date(financialFrom).toISOString(),
                                  financial_to: new Date(financialTo).toISOString(),
                                },
                                "Financial sync started",
                              )
                            }
                          >
                            Sync financials to POS
                          </Button>
                        </Stack>

                        <Typography variant="caption" color="text.secondary" component="div" sx={{ lineHeight: 1.45 }}>
                          Selected: <strong>{preview?.selectedBusinessLocationName || "None"}</strong>
                          {" · "}
                          Items: <strong>{Number(preview?.itemCount || 0)}</strong>
                          {" · "}
                          Financial rows: <strong>{Number(preview?.financialCount || 0)}</strong>
                        </Typography>
                      </Paper>

                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.25,
                          mt: 1.25,
                          borderColor: alpha(themeConfig.brandColors.navy, 0.12),
                          borderRadius: 1.5,
                        }}
                      >
                        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.75 }}>
                          Activity / status
                        </Typography>
                        {!status ? (
                          <Typography variant="caption" color="text.secondary">
                            Click Refresh to load current status.
                          </Typography>
                        ) : (
                          <>
                            <Typography variant="caption" color="text.secondary" component="div" sx={{ lineHeight: 1.45 }}>
                              Path: <strong>{status.settingsPath || "-"}</strong>
                              {" · "}
                              Connected: <strong>{String(Boolean(status.settings?.isConnected))}</strong>
                              {" · "}
                              Secret: <strong>{String(Boolean(status.settings?.hasServerSecret))}</strong>
                            </Typography>
                            <Box sx={{ mt: 0.75 }}>
                              {(status.audit || []).slice(0, 8).map((event, idx) => (
                                <Typography key={idx} variant="caption" sx={{ fontFamily: "monospace", display: "block", lineHeight: 1.5 }}>
                                  {new Date(Number(event.ts || 0)).toLocaleString()} — {String(event.action || "event")}
                                </Typography>
                              ))}
                              {!status.audit?.length ? (
                                <Typography variant="caption" color="text.secondary">
                                  No events logged yet.
                                </Typography>
                              ) : null}
                            </Box>
                          </>
                        )}
                      </Paper>
                    </AdminSectionCard>
                  </Box>
                </>
              ) : (
                <IntegrationModulePlaceholder title={tab.label} />
              )}
            </Box>
          ))}
        </Box>
      </AdminSectionCard>
    </AdminPageShell>
  )
}
