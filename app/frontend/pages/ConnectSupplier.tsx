"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material"
import { Link as LinkIcon } from "@mui/icons-material"
import { useSettings } from "../../backend/context/SettingsContext"
import { useCompany } from "../../backend/context/CompanyContext"
import { useStock } from "../../backend/context/StockContext"
import type { SupplyClientInvite } from "../../backend/interfaces/Supply"
import * as SupplyDB from "../../backend/data/Supply"
import * as StockDB from "../../backend/data/Stock"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../components/reusable/CRUDModal"
import SupplierForm from "../components/stock/forms/SupplierForm"

type LinkMode = "existing" | "new"

const ConnectSupplier: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const code = useMemo(() => searchParams.get("code") || "", [searchParams])

  const { state: settingsState } = useSettings()
  const { state: companyState, getBasePath } = useCompany()
  const stock = useStock()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invite, setInvite] = useState<SupplyClientInvite | null>(null)
  const [existingConnection, setExistingConnection] = useState<any>(null)
  const [linkedPreviewOpen, setLinkedPreviewOpen] = useState(false)

  const [mode, setMode] = useState<LinkMode>("existing")
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("")

  const [newSupplierFormData, setNewSupplierFormData] = useState<any>(null)

  const isLoggedIn = Boolean(settingsState.auth?.isLoggedIn)
  const userId = settingsState.auth?.uid || ""
  const customerCompanyId = companyState.companyID || ""

  // Load invite + existing connection
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        if (!code) {
          setError("No invite code provided.")
          return
        }
        const inv = await SupplyDB.getGlobalClientInviteByCode(code)
        if (!inv) {
          setError("Invite not found (invalid code).")
          return
        }
        // Basic expiry check (status handling is shown in UI; only hard-block on missing/expired).
        if (inv.expiresAt && inv.expiresAt < Date.now()) {
          setError("This invite has expired.")
        }

        if (!cancelled) {
          setInvite(inv)
        }

        // If we know the supplier company id and we have a customer company selected, see if already linked.
        if (inv.supplierCompanyId && customerCompanyId) {
          const existing = await SupplyDB.getSupplierConnection({
            customerCompanyId,
            supplierCompanyId: inv.supplierCompanyId,
          })
          if (!cancelled) {
            setExistingConnection(existing)
            // Pre-select the linked supplier for convenience
            if (existing?.stockSupplierId) {
              setMode("existing")
              setSelectedSupplierId(String(existing.stockSupplierId))
            }
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load invite.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [code, customerCompanyId])

  // Ensure suppliers are loaded for the selector (best-effort)
  useEffect(() => {
    if (!stock?.basePath) return
    // StockContext also has refreshSuppliers; call it if available.
    if (typeof stock.refreshSuppliers === "function") {
      void stock.refreshSuppliers().catch(() => {})
    }
  }, [stock?.basePath])

  const stockSuppliers = stock.state?.suppliers || []
  const stockBasePath = getBasePath?.("stock") || stock.basePath || ""
  const linkedSupplierId = existingConnection?.stockSupplierId ? String(existingConnection.stockSupplierId) : ""
  const linkedSupplier = linkedSupplierId ? stockSuppliers.find((s: any) => String(s?.id) === linkedSupplierId) : null

  const handleLink = async () => {
    if (!invite) return
    if (!customerCompanyId) {
      setError("Select a company before linking a supplier.")
      return
    }
    if (!stockBasePath) {
      setError("Stock is not ready (missing base path). Select a site/company and try again.")
      return
    }
    if (invite.expiresAt && invite.expiresAt < Date.now()) {
      setError("This invite has expired.")
      return
    }
    if (!invite.supplierCompanyId) {
      setError("Invite is missing supplier company information. Please regenerate the invite link.")
      return
    }

    setSubmitting(true)
    setError(null)
    const inviteSnapshot = invite
    try {
      let supplierIdToLink = ""

      if (mode === "existing") {
        if (!selectedSupplierId) {
          throw new Error("Select an existing supplier to link to.")
        }
        supplierIdToLink = selectedSupplierId
      } else {
        const payload = newSupplierFormData || {}
        const name = String(payload.name || "").trim()
        if (!name) throw new Error("Supplier name is required.")
        const id = await StockDB.createSupplier(
          {
            name,
            address: payload.address || "",
            ref: payload.ref || "",
            orderUrl: payload.orderUrl || "",
            contacts: Array.isArray(payload.contacts) ? payload.contacts : [],
            description: payload.description || "",
          },
          stockBasePath,
        )
        supplierIdToLink = id
        // Refresh list best-effort
        if (typeof stock.refreshSuppliers === "function") {
          await stock.refreshSuppliers()
        }
      }

      // Save connection in customer company
      await SupplyDB.saveSupplierConnection({
        customerCompanyId,
        supplierCompanyId: invite.supplierCompanyId,
        supplierCompanyName: invite.supplierCompanyName,
        supplierSupplyPath: invite.supplierSupplyPath,
        stockSupplierId: supplierIdToLink,
        inviteCode: invite.code,
      })

      // Mark invite accepted (supplier-side + global). If already accepted, just update linked supplier id.
      const now = Date.now()
      const updates = {
        status: invite.status === "pending" ? "accepted" : invite.status,
        acceptedAt: invite.acceptedAt || now,
        acceptedByCompanyId: invite.acceptedByCompanyId || customerCompanyId,
        acceptedByUserId: invite.acceptedByUserId || userId,
        linkedStockSupplierId: supplierIdToLink,
      } as any

      if (invite.supplierSupplyPath) {
        await SupplyDB.updateClientInvite(invite.supplierSupplyPath, invite.code, updates)
      } else {
        await SupplyDB.updateGlobalClientInvite(invite.code, updates)
      }

      // Done
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "connectSupplierLink",
        crudMode: "edit",
        id: inviteSnapshot.code,
        itemLabel: inviteSnapshot.supplierCompanyName || undefined,
      })
      navigate("/Stock/Management/Suppliers")
    } catch (e: any) {
      setError(e?.message || "Failed to link supplier.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
        <CircularProgress />
        <Typography>Loading invite…</Typography>
      </Box>
    )
  }

  if (!isLoggedIn) {
    return (
      <Box sx={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
        <CRUDModal
          open={true}
          onClose={(reason) => {
            navigate("/Login")
            if (isCrudModalHardDismiss(reason)) {
              /* navigation already ran; no local entity */
            }
          }}
          workspaceFormShortcut={{ crudEntity: "connectSupplierAuth", crudMode: "view" }}
          title="Connect supplier"
          icon={<LinkIcon />}
          mode="view"
          maxWidth="sm"
          hideDefaultActions={true}
          actions={
            <>
              <Button variant="outlined" onClick={() => navigate("/Login")}>
                Login
              </Button>
              <Button variant="contained" onClick={() => navigate("/Register")}>
                Register
              </Button>
            </>
          }
        >
          <Alert severity="warning">You need to be logged in to link a supplier.</Alert>
        </CRUDModal>
      </Box>
    )
  }

  const canProceed =
    Boolean(invite?.supplierCompanyId) &&
    Boolean(customerCompanyId) &&
    Boolean(stockBasePath) &&
    Boolean(invite?.expiresAt ? invite.expiresAt >= Date.now() : true) &&
    (invite?.status === "pending" || invite?.status === "accepted")

  const isNoOpRelink =
    Boolean(linkedSupplierId) &&
    mode === "existing" &&
    Boolean(selectedSupplierId) &&
    String(selectedSupplierId) === linkedSupplierId

  const statusNote =
    invite?.status === "accepted"
      ? "This invite has already been accepted. You can still re-link which supplier record it maps to."
      : invite?.status && invite.status !== "pending"
        ? `This invite is ${invite.status}.`
        : null

  const actions = (
    <>
      <Button variant="outlined" onClick={() => navigate("/Stock/Management/Suppliers")}>
        Cancel
      </Button>
    </>
  )

  return (
    <Box sx={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
      <CRUDModal
        open={true}
        onClose={(reason) => {
          navigate("/Stock/Management/Suppliers")
          if (isCrudModalHardDismiss(reason)) {
            /* navigation already ran; no local entity */
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "connectSupplierLink",
          crudMode: "edit",
          id: invite?.code,
          itemLabel: invite?.supplierCompanyName || undefined,
        }}
        title="Connect supplier"
        subtitle={invite?.supplierCompanyName || undefined}
        icon={<LinkIcon />}
        mode="edit"
        maxWidth="lg"
        topBarActions={
          linkedSupplierId ? (
            <Button
              variant="outlined"
              size="small"
              onClick={(e) => {
                e.stopPropagation()
                setLinkedPreviewOpen(true)
              }}
              sx={{ color: "inherit", borderColor: "rgba(255,255,255,0.5)" }}
            >
              View linked supplier
            </Button>
          ) : undefined
        }
        onSave={async () => {
          if (!canProceed || isNoOpRelink) return
          await handleLink()
        }}
        saveButtonText={existingConnection ? "Re-link" : "Link"}
        loading={submitting}
        disabled={!canProceed || isNoOpRelink}
        actions={actions}
      >
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {statusNote && <Alert severity={invite?.status === "accepted" ? "info" : "warning"} sx={{ mb: 2 }}>{statusNote}</Alert>}
        {!customerCompanyId && <Alert severity="warning" sx={{ mb: 2 }}>Select a company first, then come back to this link.</Alert>}
        {!stockBasePath && <Alert severity="warning" sx={{ mb: 2 }}>Stock is not ready (missing base path). Select a site/company and try again.</Alert>}

        {existingConnection && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Already linked to supplier ID: <strong>{existingConnection.stockSupplierId}</strong>. Choose a different one below to re-link.
          </Alert>
        )}
        {isNoOpRelink && (
          <Alert severity="info" sx={{ mb: 2 }}>
            You selected the currently linked supplier. Pick a different supplier to re-link.
          </Alert>
        )}

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Link mode</InputLabel>
          <Select label="Link mode" value={mode} onChange={(e) => setMode(e.target.value as LinkMode)}>
            <MenuItem value="existing">Link to an existing supplier</MenuItem>
            <MenuItem value="new">Create a new supplier</MenuItem>
          </Select>
        </FormControl>

        {mode === "existing" ? (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select supplier</InputLabel>
            <Select label="Select supplier" value={selectedSupplierId} onChange={(e) => setSelectedSupplierId(String(e.target.value))}>
              <MenuItem value="">
                <em>Select…</em>
              </MenuItem>
              {stockSuppliers
                .slice()
                .sort((a: any, b: any) => String(a.name || "").localeCompare(String(b.name || "")))
                .map((s: any) => (
                  <MenuItem key={s.id} value={s.id} disabled={linkedSupplierId && String(s.id) === linkedSupplierId}>
                    {s.name}{linkedSupplierId && String(s.id) === linkedSupplierId ? " (linked)" : ""}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        ) : (
          <SupplierForm
            supplier={null}
            mode="create"
            onSave={() => {}}
            onFormDataChange={setNewSupplierFormData}
          />
        )}
      </CRUDModal>

      <CRUDModal
        open={linkedPreviewOpen}
        onClose={(reason) => {
          setLinkedPreviewOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            /* preview state cleared via open flag */
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "connectSupplierLinkedPreview",
          crudMode: "view",
          id: linkedSupplierId || undefined,
          itemLabel: linkedSupplier?.name || undefined,
        }}
        title="Linked supplier"
        subtitle={linkedSupplier?.name || linkedSupplierId || undefined}
        icon={<LinkIcon />}
        mode="view"
        maxWidth="lg"
        hideDefaultActions={true}
      >
        {linkedSupplier ? (
          <SupplierForm supplier={linkedSupplier} mode="view" onSave={() => {}} />
        ) : (
          <Alert severity="info">
            The linked supplier ({linkedSupplierId}) isn’t loaded in this session yet. Open Suppliers and refresh, then try again.
          </Alert>
        )}
      </CRUDModal>
    </Box>
  )
}

export default ConnectSupplier

