import React, { useEffect, useMemo, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Divider,
  FormControlLabel,
  Grid,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material"
import { Business as BusinessIcon, Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material"
import DataHeader from "../../components/reusable/DataHeader"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../components/reusable/CRUDModal"
import { db, get, onValue, push, ref, remove, set, update } from "../../../backend/services/Firebase"
import { useSettings } from "../../../backend/context/SettingsContext"

type CompanyType = "hospitality" | "supplier" | "other"

type CompanyRow = {
  id: string
  companyName: string
  legalName?: string
  companyType?: CompanyType
  companyEmail?: string
  companyPhone?: string
  companyWebsite?: string
  companyIndustry?: string
  companyStatus?: string
  companyAddress?: string
  companyCreated?: string
  companyUpdated?: string
  raw: any
}

type ModalMode = "create" | "edit" | "view"

export default function AdminCompanies() {
  const location = useLocation()
  const { state: settingsState } = useSettings()
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState<CompanyRow[]>([])
  const [legacyAdminCompaniesCount, setLegacyAdminCompaniesCount] = useState<number>(0)
  const [migrating, setMigrating] = useState(false)
  const [search, setSearch] = useState("")
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [typeFilter, setTypeFilter] = useState<CompanyType[]>([])
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [sortValue, setSortValue] = useState<"updated" | "name">("updated")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>("view")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const formRef = useRef<{ submit: () => void }>(null)

  const [ownerInviteEmail, setOwnerInviteEmail] = useState("")
  const [ownerInviteLink, setOwnerInviteLink] = useState("")
  const [ownerInviteLoading, setOwnerInviteLoading] = useState(false)

  const [form, setForm] = useState({
    companyName: "",
    legalName: "",
    companyType: "hospitality" as CompanyType,
    companyEmail: "",
    companyPhone: "",
    companyWebsite: "",
    companyIndustry: "",
    companyStatus: "active",
    companyAddress: "",
    createMainSite: true,
    attachMeAsOwner: false,
  })

  useEffect(() => {
    setLoading(true)
    const companiesRef = ref(db, "companies")
    const unsub = onValue(
      companiesRef,
      (snap) => {
        const v = snap.val() || {}
        const rows: CompanyRow[] = Object.entries(v).map(([id, raw]: any) => ({
          id,
          companyName: raw?.companyName || raw?.name || "Untitled",
          legalName: raw?.legalName || "",
          companyType: raw?.companyType || "hospitality",
          companyEmail: raw?.companyEmail || "",
          companyPhone: raw?.companyPhone || "",
          companyWebsite: raw?.companyWebsite || "",
          companyIndustry: raw?.companyIndustry || "",
          companyStatus: raw?.companyStatus || "",
          companyAddress: raw?.companyAddress || "",
          companyCreated: raw?.companyCreated || "",
          companyUpdated: raw?.companyUpdated || "",
          raw,
        }))
        setCompanies(rows)
        setLoading(false)
      },
      () => setLoading(false),
    )

    // Also check legacy path to help migrate existing data
    ;(async () => {
      try {
        const legacySnap = await get(ref(db, "admin/companies"))
        const legacy = legacySnap.val() || {}
        setLegacyAdminCompaniesCount(Object.keys(legacy || {}).length)
      } catch {
        setLegacyAdminCompaniesCount(0)
      }
    })()

    return () => unsub()
  }, [])

  const selected = useMemo(() => {
    if (!selectedId) return null
    return companies.find((c) => c.id === selectedId) || null
  }, [companies, selectedId])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = companies.filter((c) => {
      if (typeFilter.length > 0 && !typeFilter.includes((c.companyType || "other") as CompanyType)) return false
      if (statusFilter.length > 0 && !statusFilter.includes(String(c.companyStatus || ""))) return false
      if (!q) return true
      return (
        c.companyName.toLowerCase().includes(q) ||
        String(c.legalName || "").toLowerCase().includes(q) ||
        String(c.companyEmail || "").toLowerCase().includes(q) ||
        String(c.companyPhone || "").toLowerCase().includes(q) ||
        String(c.companyIndustry || "").toLowerCase().includes(q) ||
        String(c.id || "").toLowerCase().includes(q)
      )
    })

    const dir = sortDirection === "asc" ? 1 : -1
    return [...base].sort((a, b) => {
      if (sortValue === "name") return a.companyName.localeCompare(b.companyName) * dir
      return String(a.companyUpdated || "").localeCompare(String(b.companyUpdated || "")) * dir
    })
  }, [companies, search, typeFilter, statusFilter, sortValue, sortDirection])

  const openCreate = () => {
    setSelectedId(null)
    setModalMode("create")
    setOwnerInviteEmail("")
    setOwnerInviteLink("")
    setForm({
      companyName: "",
      legalName: "",
      companyType: "hospitality",
      companyEmail: "",
      companyPhone: "",
      companyWebsite: "",
      companyIndustry: "",
      companyStatus: "active",
      companyAddress: "",
      createMainSite: true,
      attachMeAsOwner: false,
    })
    setModalOpen(true)
  }

  const openView = (companyId: string) => {
    const c = companies.find((x) => x.id === companyId)
    setSelectedId(companyId)
    setModalMode("view")
    setOwnerInviteEmail("")
    setOwnerInviteLink("")
    setForm({
      companyName: c?.companyName || "",
      legalName: c?.legalName || "",
      companyType: (c?.companyType || "hospitality") as CompanyType,
      companyEmail: c?.companyEmail || "",
      companyPhone: c?.companyPhone || "",
      companyWebsite: c?.companyWebsite || "",
      companyIndustry: c?.companyIndustry || "",
      companyStatus: c?.companyStatus || "active",
      companyAddress: c?.companyAddress || "",
      createMainSite: true,
      attachMeAsOwner: false,
    })
    setModalOpen(true)
  }

  const switchToEdit = () => setModalMode("edit")

  const doSave = async () => {
    if (!form.companyName.trim()) return
    const modeSnapshot = modalMode
    const selectedSnapshot = selectedId
    const itemLabelSnapshot = (selected?.companyName || form.companyName || "").trim()
    const nowIso = new Date().toISOString()
    const payload = {
      companyName: form.companyName.trim(),
      legalName: (form.legalName || form.companyName).trim(),
      companyType: form.companyType,
      companyEmail: form.companyEmail,
      companyPhone: form.companyPhone,
      companyWebsite: form.companyWebsite,
      companyIndustry: form.companyIndustry,
      companyStatus: form.companyStatus,
      companyAddress: form.companyAddress,
      companyUpdated: nowIso,
    }

    if (modalMode === "create") {
      const newRef = push(ref(db, "companies"))
      const id = newRef.key || ""
      await set(newRef, { ...payload, companyCreated: nowIso, companyID: id, id })

      // Optional: attach current admin user as owner (creates the user↔company mapping both ways)
      const uid = settingsState.auth?.uid
      if (uid && form.attachMeAsOwner) {
        const now = Date.now()
        await update(ref(db, `users/${uid}/companies/${id}`), {
          companyID: id,
          companyName: payload.companyName,
          role: "owner",
          department: "Management",
          joinedAt: now,
          isDefault: true,
        } as any)
        await update(ref(db, `companies/${id}/users/${uid}`), {
          role: "owner",
          department: "Management",
          joinedAt: now,
          email: settingsState.auth?.email || "",
          displayName: (settingsState.user as any)?.displayName || "",
        } as any)
        await update(ref(db, `companies/${id}`), {
          ownerId: uid,
          ownerEmail: settingsState.auth?.email || "",
          ownerName: (settingsState.user as any)?.displayName || "",
          ownerSetAt: now,
          companyUpdated: nowIso,
        } as any)
      }

      // Optional: create a default site (matches the standard createCompany flow)
      if (form.createMainSite) {
        const siteRef = push(ref(db, `companies/${id}/sites`))
        const siteId = siteRef.key || ""
        if (siteId) {
          await set(siteRef, {
            siteID: siteId,
            companyID: id,
            name: "Main Site",
            description: "Default site",
            address: { street: "", city: "", state: "", zipCode: "", country: "" },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          } as any)
        }
      }
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "adminCompaniesModal1",
        crudMode: modeSnapshot,
        id: id || undefined,
        itemLabel: itemLabelSnapshot || undefined,
      })
      setSelectedId(id)
      setModalMode("view")
      return
    }

    if (!selectedId) return
    if (modalMode === "edit") {
      await update(ref(db, `companies/${selectedId}`), payload as any)
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "adminCompaniesModal1",
        crudMode: modeSnapshot,
        id: selectedSnapshot || undefined,
        itemLabel: itemLabelSnapshot || undefined,
      })
      setModalMode("view")
      return
    }
  }

  const deleteSelected = async () => {
    if (!selectedId) return
    await remove(ref(db, `companies/${selectedId}`))
    setModalOpen(false)
  }

  const migrateLegacyAdminCompanies = async () => {
    setMigrating(true)
    try {
      const legacySnap = await get(ref(db, "admin/companies"))
      const legacy = (legacySnap.val() || {}) as Record<string, any>
      if (!legacy || Object.keys(legacy).length === 0) return

      // Only copy missing IDs to avoid overwriting existing companies.
      const updates: Record<string, any> = {}
      Object.entries(legacy).forEach(([id, raw]) => {
        if (!id) return
        if (companies.some((c) => c.id === id)) return
        const nowIso = new Date().toISOString()
        updates[`companies/${id}`] = {
          ...(raw || {}),
          companyID: id,
          id,
          companyName: raw?.companyName || raw?.name || "Untitled",
          companyUpdated: raw?.companyUpdated || nowIso,
          companyCreated: raw?.companyCreated || nowIso,
        }
      })
      if (Object.keys(updates).length > 0) {
        await update(ref(db), updates as any)
      }
    } finally {
      setMigrating(false)
    }
  }

  const generateOwnerInvite = async () => {
    if (!selectedId) return
    if (!ownerInviteEmail.trim()) return
    setOwnerInviteLoading(true)
    try {
      const email = ownerInviteEmail.trim().toLowerCase()
      const companyName = selected?.companyName || ""
      const now = Date.now()
      const expiresAt = now + 14 * 24 * 60 * 60 * 1000

      const invitesRef = ref(db, "invites")
      const newInviteRef = push(invitesRef)
      const inviteId = newInviteRef.key || ""
      if (!inviteId) return

      const code =
        Math.random().toString(36).substring(2, 10).toUpperCase() +
        Math.random().toString(36).substring(2, 8).toUpperCase()

      await set(newInviteRef, {
        id: inviteId,
        inviteID: inviteId,
        code,
        email,
        companyID: selectedId,
        companyName,
        role: "owner",
        department: "Management",
        status: "pending",
        invitedBy: settingsState.auth?.uid || "",
        invitedByName: (settingsState.user as any)?.displayName || "",
        invitedAt: now,
        expiresAt,
        setAsOwner: true,
      } as any)

      const origin = window.location.origin
      const basePath = "/App" // Match BrowserRouter basename in app/main.tsx
      const link = `${origin}${basePath}/JoinCompany?code=${encodeURIComponent(code)}`
      setOwnerInviteLink(link)
      try {
        await navigator.clipboard.writeText(link)
      } catch {
        // ignore (clipboard may be blocked)
      }
    } finally {
      setOwnerInviteLoading(false)
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      {legacyAdminCompaniesCount > 0 ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Found {legacyAdminCompaniesCount} legacy companies under <strong>admin/companies</strong>. Companies now live under{" "}
          <strong>companies</strong>.{" "}
          <Button
            size="small"
            variant="outlined"
            sx={{ ml: 1 }}
            disabled={migrating}
            onClick={migrateLegacyAdminCompanies}
          >
            {migrating ? "Migrating..." : "Migrate now"}
          </Button>
        </Alert>
      ) : null}
      <DataHeader
        showDateControls={false}
        showDateTypeSelector={false}
        searchTerm={search}
        onSearchChange={(t) => setSearch(t)}
        searchPlaceholder="Search company name, email, phone, industry, ID…"
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded((p) => !p)}
        filters={[
          {
            label: "Type",
            options: [
              { id: "hospitality", name: "hospitality" },
              { id: "supplier", name: "supplier" },
              { id: "other", name: "other" },
            ],
            selectedValues: typeFilter,
            onSelectionChange: (values) => setTypeFilter(values as CompanyType[]),
          },
          {
            label: "Status",
            options: [
              { id: "active", name: "active" },
              { id: "inactive", name: "inactive" },
              { id: "trial", name: "trial" },
              { id: "suspended", name: "suspended" },
            ],
            selectedValues: statusFilter,
            onSelectionChange: (values) => setStatusFilter(values),
          },
        ]}
        sortOptions={[
          { value: "updated", label: "Last updated" },
          { value: "name", label: "Name" },
        ]}
        sortValue={sortValue}
        sortDirection={sortDirection}
        onSortChange={(value, direction) => {
          setSortValue(value as any)
          setSortDirection(direction)
        }}
        onCreateNew={openCreate}
        createButtonLabel="New Company"
      />

      <Card>
        <CardContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>ID</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="text.secondary">No companies found.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow
                      key={c.id}
                      hover
                      sx={{ cursor: "pointer" }}
                      onClick={() => openView(c.id)}
                    >
                      <TableCell>
                        <Typography fontWeight={700}>{c.companyName}</Typography>
                      </TableCell>
                      <TableCell>{c.companyType || "—"}</TableCell>
                      <TableCell>{c.companyEmail || "—"}</TableCell>
                      <TableCell>{c.companyPhone || "—"}</TableCell>
                      <TableCell>{c.companyStatus || "—"}</TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {c.id}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

                        <CRUDModal
              open={modalOpen}
              onClose={(reason) => {
                setModalOpen(false)
                if (isCrudModalHardDismiss(reason)) {
                  setSelectedId(null)
                  setModalMode("view")
                }
              }}
              workspaceFormShortcut={{
                crudEntity: "adminCompaniesModal1",
                crudMode: modalMode,
                id: selectedId || undefined,
                itemLabel: selected?.companyName || form.companyName || undefined,
              }}
              title={
                modalMode === "create" ? "Create company" : modalMode === "edit" ? "Edit company" : "Company"
              }
              subtitle={selected ? `${selected.companyName} • ${selected.id}` : undefined}
              icon={<BusinessIcon />}
              mode={modalMode}
              onEdit={modalMode === "view" ? switchToEdit : undefined}
              onSave={async () => doSave()}
              saveButtonText={modalMode === "create" ? "Create" : "Save"}
              formRef={formRef as any}
              topBarActions={modalMode === "view" && selectedId ? (
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={switchToEdit}
              >
                Edit
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={deleteSelected}
              >
                Delete
              </Button>
            </Box>
          ) : null}
            >
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            This follows the HR pattern: list page + CRUD modal for view/edit/create.
          </Alert>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Company name"
                fullWidth
                required
                value={form.companyName}
                disabled={modalMode === "view"}
                onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Legal name"
                fullWidth
                value={form.legalName}
                disabled={modalMode === "view"}
                onChange={(e) => setForm((p) => ({ ...p, legalName: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Select
                fullWidth
                value={form.companyType}
                disabled={modalMode === "view"}
                onChange={(e) => setForm((p) => ({ ...p, companyType: e.target.value as CompanyType }))}
              >
                <MenuItem value="hospitality">hospitality</MenuItem>
                <MenuItem value="supplier">supplier</MenuItem>
                <MenuItem value="other">other</MenuItem>
              </Select>
              <Typography variant="caption" color="text.secondary">
                Company type
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <Select
                fullWidth
                value={form.companyStatus}
                disabled={modalMode === "view"}
                onChange={(e) => setForm((p) => ({ ...p, companyStatus: String(e.target.value) }))}
              >
                <MenuItem value="active">active</MenuItem>
                <MenuItem value="inactive">inactive</MenuItem>
                <MenuItem value="trial">trial</MenuItem>
                <MenuItem value="suspended">suspended</MenuItem>
              </Select>
              <Typography variant="caption" color="text.secondary">
                Status
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Industry"
                fullWidth
                value={form.companyIndustry}
                disabled={modalMode === "view"}
                onChange={(e) => setForm((p) => ({ ...p, companyIndustry: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Email"
                fullWidth
                value={form.companyEmail}
                disabled={modalMode === "view"}
                onChange={(e) => setForm((p) => ({ ...p, companyEmail: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Phone"
                fullWidth
                value={form.companyPhone}
                disabled={modalMode === "view"}
                onChange={(e) => setForm((p) => ({ ...p, companyPhone: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Website"
                fullWidth
                value={form.companyWebsite}
                disabled={modalMode === "view"}
                onChange={(e) => setForm((p) => ({ ...p, companyWebsite: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Address (single line)"
                fullWidth
                value={form.companyAddress}
                disabled={modalMode === "view"}
                onChange={(e) => setForm((p) => ({ ...p, companyAddress: e.target.value }))}
              />
            </Grid>

            {modalMode === "create" ? (
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={Boolean(form.attachMeAsOwner)}
                      onChange={(e) => setForm((p) => ({ ...p, attachMeAsOwner: e.target.checked }))}
                    />
                  }
                  label="Attach me as owner (grants access in users/* and companies/*)"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={Boolean(form.createMainSite)}
                      onChange={(e) => setForm((p) => ({ ...p, createMainSite: e.target.checked }))}
                    />
                  }
                  label="Create Main Site"
                />
              </Grid>
            ) : null}

            {modalMode !== "create" && selectedId ? (
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography fontWeight={700} sx={{ mb: 1 }}>
                  Invite owner
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Owner email"
                      fullWidth
                      value={ownerInviteEmail}
                      onChange={(e) => setOwnerInviteEmail(e.target.value)}
                      placeholder="owner@company.com"
                    />
                  </Grid>
                  <Grid item xs={12} md={6} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Button
                      variant="contained"
                      onClick={generateOwnerInvite}
                      disabled={ownerInviteLoading || !ownerInviteEmail.trim()}
                    >
                      {ownerInviteLoading ? "Generating..." : "Generate link"}
                    </Button>
                    {ownerInviteLink ? (
                      <Button
                        variant="outlined"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(ownerInviteLink)
                          } catch {
                            // ignore
                          }
                        }}
                      >
                        Copy
                      </Button>
                    ) : null}
                  </Grid>
                  {ownerInviteLink ? (
                    <Grid item xs={12}>
                      <TextField label="Invite link" fullWidth value={ownerInviteLink} InputProps={{ readOnly: true }} />
                    </Grid>
                  ) : null}
                </Grid>
              </Grid>
            ) : null}
          </Grid>
        </Box>
      </CRUDModal>
    </Box>
  )
}

