"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { alpha } from "@mui/material/styles"
import {
  Alert,
  Box,
  Button,
  Divider,
  Grid,
  MenuItem,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material"
import { Send as SendIcon } from "@mui/icons-material"
import { format } from "date-fns"
import { useCompany } from "../../../backend/context/CompanyContext"
import { useStock } from "../../../backend/context/StockContext"
import type { Purchase } from "../../../backend/interfaces/Stock"
import { APP_KEYS } from "../../../backend/config/keys"
import { fetchStockEmailConfig } from "../../../backend/data/Stock"
import { themeConfig } from "../../../backend/context/AppTheme"
import { functions, httpsCallable } from "../../../backend/services/Firebase"

type StockEmailConfig = {
  email?: string
  senderName?: string
  updatedAt?: number
  hasAppPassword?: boolean
}

export type OrderDeliveryPanelProps = {
  purchaseIds: string[]
  embedded?: boolean
  onBack?: () => void
  onDone?: () => void
}

function safeString(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v)
}

function formatSubjectSegment(value: unknown): string {
  return safeString(value).trim().replace(/\s+/g, " ").toUpperCase()
}

function buildDefaultEmail(purchase: any, signOffName: string, venueName: string, locationName: string) {
  const supplierName = safeString(purchase?.supplierName || purchase?.supplier || "")
  const deliveryDate = safeString(purchase?.deliveryDate || purchase?.expectedDeliveryDate || purchase?.dateUK || "")
  const purchaseId = safeString(purchase?.id || "")

  const subjectParts = [formatSubjectSegment(venueName)]
  const normalizedLocation = formatSubjectSegment(locationName)
  if (normalizedLocation) {
    subjectParts.push(normalizedLocation)
  }
  if (purchaseId) {
    subjectParts.push(`ORDER ${purchaseId}`)
  }
  const subject = subjectParts.filter(Boolean).join(" - ")

  const items: any[] = Array.isArray(purchase?.items) ? purchase.items : []
  const lines = items
    .map((it) => {
      const name = safeString(it?.productName || it?.name || it?.itemName || "")
      const qty = Number(it?.quantity || 0) || 0
      const unitPrice = Number(it?.unitPrice || 0) || 0
      const total = Number(it?.totalPrice || qty * unitPrice || 0) || 0
      return `- ${qty} x ${name} @ £${unitPrice.toFixed(2)} = £${total.toFixed(2)}`
    })
    .join("\n")

  const totalAmount = Number(purchase?.totalAmount ?? purchase?.totalValue ?? 0) || 0
  const body = [
    `Hello${supplierName ? ` ${supplierName}` : ""},`,
    ``,
    `Please find our purchase order details below:`,
    ``,
    purchaseId ? `Order ID: ${purchaseId}` : null,
    deliveryDate ? `Requested delivery date: ${deliveryDate}` : null,
    ``,
    `Items:`,
    lines || `- (no items)`,
    ``,
    `Total: £${totalAmount.toFixed(2)}`,
    ``,
    `Kind regards,`,
    signOffName || `1Stop`,
  ]
    .filter((x) => x !== null)
    .join("\n")

  return { subject, body }
}

export default function OrderDeliveryPanel({ purchaseIds }: OrderDeliveryPanelProps) {
  const { state: companyState } = useCompany()
  const { state: stockState, fetchAllPurchases, refreshSuppliers } = useStock()

  const [tab, setTab] = useState<"email" | "api">("email")
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [savingMailbox, setSavingMailbox] = useState(false)

  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string>("")

  const [emailConfig, setEmailConfig] = useState<StockEmailConfig | null>(null)
  const [configEmail, setConfigEmail] = useState("")
  const [configSenderName, setConfigSenderName] = useState("")
  const [configAppPassword, setConfigAppPassword] = useState("")

  const [toEmail, setToEmail] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const siteId = companyState.selectedSiteID || "default"
  const subsiteId = companyState.selectedSubsiteID || "default"
  const companyId = companyState.companyID

  const basePath = useMemo(() => {
    if (!companyId) return null
    return `companies/${companyId}/sites/${siteId}/subsites/${subsiteId}`
  }, [companyId, siteId, subsiteId])

  const stockEmailConfigPath = basePath ? `${basePath}/stockEmailConfig` : null

  const suppliersById = useMemo(() => {
    const m = new Map<string, any>()
    ;(stockState.suppliers || []).forEach((s: any) => {
      const id = safeString(s?.id || s?.supplierId || s?.supplierID || s?.ref || "").trim()
      if (id) m.set(id, s)
    })
    return m
  }, [stockState.suppliers])

  const selectedPurchase = useMemo(() => {
    return purchases.find((p: any) => safeString(p?.id) === safeString(selectedPurchaseId)) as any
  }, [purchases, selectedPurchaseId])

  const resolveSupplierEmailForPurchase = useCallback(
    (purchase: any): string => {
      const supplierId = safeString(purchase?.supplierId || "")
      const sup = suppliersById.get(supplierId)
      const contactEmail =
        (Array.isArray(sup?.contacts) ? sup.contacts.find((c: any) => c?.email)?.email : null) || null
      return safeString(contactEmail || sup?.email || purchase?.supplierEmail || "")
    },
    [suppliersById],
  )

  useEffect(() => {
    if (stockState.suppliers?.length === 0) {
      refreshSuppliers().catch(() => {})
    }
  }, [refreshSuppliers, stockState.suppliers?.length])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setError(null)
      setSuccess(null)
      if (!companyId) return
      if (!purchaseIds || purchaseIds.length === 0) return

      setLoading(true)
      try {
        const all = await fetchAllPurchases()
        const setIds = new Set(purchaseIds.map((x) => safeString(x)))
        const filtered = (all || []).filter((p: any) => setIds.has(safeString(p?.id)))
        if (!cancelled) {
          setPurchases(filtered as any)
          setSelectedPurchaseId((prev) => prev || safeString(filtered[0]?.id || ""))
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load purchases for delivery")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [companyId, fetchAllPurchases, purchaseIds])

  useEffect(() => {
    let cancelled = false
    const loadConfig = async () => {
      if (!stockEmailConfigPath) return
      try {
        const v = await fetchStockEmailConfig(stockEmailConfigPath) as StockEmailConfig | null
        let hasAppPassword = false
        if (functions && companyId) {
          try {
            const getMailboxStatus = httpsCallable(functions, "getMailboxSecretSettingsStatus")
            const result = await getMailboxStatus({
              companyId,
              siteId,
              subsiteId,
              configType: "stock",
            })
            hasAppPassword = Boolean((result.data as any)?.hasAppPassword)
          } catch {
            hasAppPassword = false
          }
        }
        if (cancelled) return
        const nextConfig = v
          ? {
              email: v.email,
              senderName: v.senderName,
              updatedAt: v.updatedAt,
              hasAppPassword,
            }
          : null
        setEmailConfig(nextConfig)
        setConfigEmail(nextConfig?.email || "")
        setConfigSenderName(nextConfig?.senderName || "")
      } catch {
        // ignore
      }
    }
    loadConfig()
    return () => {
      cancelled = true
    }
  }, [stockEmailConfigPath])

  const handleSaveMailbox = async () => {
    setError(null)
    setSuccess(null)
    if (!companyId) {
      setError("Company ID not found")
      return
    }
    if (!configEmail.trim()) {
      setError("Mailbox email is required")
      return
    }
    if (!configAppPassword.trim() && !emailConfig?.hasAppPassword) {
      setError("App password is required for the first secure save")
      return
    }
    if (!functions) {
      setError("Firebase Functions is not available")
      return
    }

    setSavingMailbox(true)
    try {
      const saveMailboxStatus = httpsCallable(functions, "saveMailboxSecretSettings")
      const result = await saveMailboxStatus({
        companyId,
        siteId,
        subsiteId,
        configType: "stock",
        email: configEmail.trim(),
        senderName: configSenderName.trim() || "1Stop Stock",
        appPassword: configAppPassword.trim() || undefined,
      })
      const data = (result.data || {}) as any
      setEmailConfig({
        email: data.email || configEmail.trim(),
        senderName: data.senderName || configSenderName.trim() || "1Stop Stock",
        updatedAt: data.updatedAt || Date.now(),
        hasAppPassword: Boolean(data.hasAppPassword),
      })
      setConfigAppPassword("")
      setSuccess("Mailbox saved securely")
    } catch (e: any) {
      setError(e?.message || "Failed to save mailbox securely")
    } finally {
      setSavingMailbox(false)
    }
  }

  useEffect(() => {
    if (!selectedPurchase) return
    const to = resolveSupplierEmailForPurchase(selectedPurchase)
    const locationName =
      safeString(companyState.selectedSubsiteName) ||
      safeString(companyState.selectedSiteName) ||
      ""
    const venueName = safeString(companyState.companyName) || locationName || "1Stop"
    const signOff = locationName || venueName || "1Stop"
    const defaults = buildDefaultEmail(selectedPurchase, signOff, venueName, locationName)
    setToEmail(to)
    setSubject(defaults.subject)
    setBody(defaults.body)
    setError(null)
    setSuccess(null)
  }, [companyState.companyName, companyState.selectedSiteName, companyState.selectedSubsiteName, resolveSupplierEmailForPurchase, selectedPurchaseId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSendEmail = async () => {
    setError(null)
    setSuccess(null)
    if (!companyId) {
      setError("Company ID not found")
      return
    }
    if (!selectedPurchaseId) {
      setError("Select a purchase first")
      return
    }
    if (!toEmail.trim()) {
      setError("Recipient email is required")
      return
    }
    if (!subject.trim()) {
      setError("Subject is required")
      return
    }
    if (!body.trim()) {
      setError("Body is required")
      return
    }

    setSending(true)
    try {
      const projectId = APP_KEYS?.firebase?.projectId || "stop-test-8025f"
      const region = "us-central1"
      const fnBase = `https://${region}-${projectId}.cloudfunctions.net`

      const response = await fetch(`${fnBase}/sendStockOrderEmail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          siteId,
          subsiteId,
          purchaseId: selectedPurchaseId,
          supplierId: safeString(selectedPurchase?.supplierId || ""),
          to: toEmail.trim(),
          subject: subject.trim(),
          body,
        }),
      })
      const data = await response.json()
      if (!data?.success) {
        throw new Error(data?.error || "Failed to send email")
      }
      setSuccess("Email sent and logged")
    } catch (e: any) {
      setError(e?.message || "Failed to send email")
    } finally {
      setSending(false)
    }
  }

  if (!purchaseIds || purchaseIds.length === 0) {
    return (
      <Alert severity="warning">
        No purchases were provided to deliver. Please place an order first.
      </Alert>
    )
  }

  return (
    <Box>
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      ) : null}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="email" label="Email order" />
        <Tab value="api" label="API order" />
      </Tabs>

      {tab === "api" ? (
        <Box sx={{ py: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Coming soon
          </Typography>
          <Typography variant="body2" color="text.secondary">
            API ordering will be added here.
          </Typography>
        </Box>
      ) : (
        <Box>
          {loading ? (
            <Typography variant="body2" color="text.secondary">
              Loading purchases…
            </Typography>
          ) : null}

          <Box sx={{ mb: 2, p: 2, border: `1px solid ${alpha(themeConfig.brandColors.navy, 0.12)}`, borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              Stock Mailbox
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Store the mailbox password securely on the server. It will not be returned to the browser after save.
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Mailbox Email"
                  value={configEmail}
                  onChange={(e) => setConfigEmail(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Sender Name"
                  value={configSenderName}
                  onChange={(e) => setConfigSenderName(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  label={emailConfig?.hasAppPassword ? "Replace App Password" : "App Password"}
                  type="password"
                  value={configAppPassword}
                  onChange={(e) => setConfigAppPassword(e.target.value)}
                  helperText={emailConfig?.hasAppPassword ? "Leave blank to keep the current stored password." : "Required for the first secure save."}
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
                  <Typography variant="caption" color="text.secondary">
                    {emailConfig?.hasAppPassword ? "Server-side password stored." : "No server-side password stored yet."}
                  </Typography>
                  <Button variant="outlined" onClick={handleSaveMailbox} disabled={savingMailbox}>
                    {savingMailbox ? "Saving..." : "Save Mailbox Securely"}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={5}>
              <TextField
                select
                fullWidth
                label="Purchase"
                size="small"
                value={selectedPurchaseId}
                onChange={(e) => setSelectedPurchaseId(e.target.value)}
              >
                {purchases.map((p: any) => (
                  <MenuItem key={safeString(p.id)} value={safeString(p.id)}>
                    {safeString(p.supplierName || p.supplier || "Supplier")} • {safeString(p.id)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={7}>
              <TextField
                fullWidth
                label="To"
                size="small"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
              />
            </Grid>
          </Grid>

          {!emailConfig?.email ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Stock mailbox is not configured. Please set this up in <strong>Stock → Settings</strong> to enable sending supplier emails.
            </Alert>
          ) : (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
              Sending from: {emailConfig.email} • Last updated:{" "}
              {emailConfig.updatedAt ? format(new Date(emailConfig.updatedAt), "dd/MM/yyyy HH:mm") : "—"}
            </Typography>
          )}

          <TextField
            label="Subject"
            size="small"
            fullWidth
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            label="Body"
            fullWidth
            multiline
            minRows={10}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            sx={{ mb: 2 }}
          />

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={handleSendEmail}
              disabled={sending || !emailConfig?.email}
              sx={{
                bgcolor: themeConfig.brandColors.navy,
                color: themeConfig.brandColors.offWhite,
                "&:hover": { bgcolor: themeConfig.brandColors.navy },
              }}
            >
              {sending ? "Sending…" : "Send email"}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  )
}

