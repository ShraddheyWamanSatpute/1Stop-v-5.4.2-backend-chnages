import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import {
  Alert,
  Box,
  Button,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  Autocomplete,
} from "@mui/material"
import { Business as BusinessIcon, Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material"
import DataHeader from "../../app/frontend/components/reusable/DataHeader"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../app/frontend/components/reusable/CRUDModal"
import EmptyStateCard from "../../app/frontend/components/reusable/EmptyStateCard"
import { db, get, onValue, push, ref, remove, set, update } from "../backend/services/Firebase"
import { useAdmin } from "../backend/context/AdminContext"
import { AdminPageShell, AdminSectionCard } from "./shared/AdminPageShell"

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
  linkedClientId?: string
  raw: any
}

type CRMClientOption = {
  id: string
  name: string
}

type ModalMode = "create" | "edit" | "view"

export type AdminCompaniesLabels = {
  singular: string
  plural: string
  createButtonLabel?: string
  emptyTitle?: string
  emptyDescription?: string
}

type ColumnConfig = {
  id: string
  label: string
  minWidth?: number
  align?: "left" | "right" | "center"
}

export default function AdminCompanies({ labels }: { labels?: AdminCompaniesLabels }) {
  const toPascalLabel = useCallback((raw: any) => {
    const s = String(raw || "").trim()
    if (!s) return "—"
    return s
      .replace(/_/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  }, [])

  const entitySingular = labels?.singular || "Company"
  const entityPlural = labels?.plural || "Companies"
  const createButtonLabel = labels?.createButtonLabel || `New ${entitySingular}`
  const emptyTitle = labels?.emptyTitle || `No ${entityPlural.toLowerCase()} found`
  const emptyDescription = labels?.emptyDescription || "Try adjusting your search or filters."

  const { state } = useAdmin()
  const location = useLocation()
  const [companies, setCompanies] = useState<CompanyRow[]>([])
  const [legacyAdminCompaniesCount, setLegacyAdminCompaniesCount] = useState<number>(0)
  const [migrating, setMigrating] = useState(false)
  const [migrationNotice, setMigrationNotice] = useState<string>("")
  const [search, setSearch] = useState("")
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [typeFilter, setTypeFilter] = useState<CompanyType[]>([])
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [sortValue, setSortValue] = useState<"updated" | "name">("updated")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>("view")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const formRef = useRef<{ submit: () => void }>(null)

  const [ownerInviteEmail, setOwnerInviteEmail] = useState("")
  const [ownerInviteLink, setOwnerInviteLink] = useState("")
  const [ownerInviteLoading, setOwnerInviteLoading] = useState(false)

  const [crmClients, setCrmClients] = useState<CRMClientOption[]>([])

  const [form, setForm] = useState({
    companyName: "",
    legalName: "",
    companyType: "hospitality" as CompanyType,
    companyWebsite: "",
    companyIndustry: "",
    companyStatus: "active",
    addressLine1: "",
    addressLine2: "",
    addressCity: "",
    addressPostcode: "",
    addressCountry: "",
    linkedClientId: "",
  })

  useEffect(() => {
    const clientsRef = ref(db, "admin/crm/clients")
    const unsubClients = onValue(
      clientsRef,
      (snap: any) => {
        const v = snap.val() || {}
        const rows: CRMClientOption[] = Object.entries(v).map(([id, raw]: any) => ({
          id,
          name: raw?.name || raw?.companyName || "Untitled",
        }))
        rows.sort((a, b) => a.name.localeCompare(b.name))
        setCrmClients(rows)
      },
      () => {},
    )
    return () => unsubClients()
  }, [])

  useEffect(() => {
    const companiesRef = ref(db, "companies")
    const unsub = onValue(
      companiesRef,
      (snap: any) => {
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
          linkedClientId: raw?.linkedClientId || "",
          raw,
        }))
        setCompanies(rows)
      },
      () => {},
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

  const columns: ColumnConfig[] = useMemo(
    () => [
      { id: "companyName", label: "Name", minWidth: 240 },
      { id: "companyType", label: "Type", minWidth: 140 },
      { id: "companyEmail", label: "Email", minWidth: 220 },
      { id: "companyPhone", label: "Phone", minWidth: 160 },
      { id: "companyStatus", label: "Status", minWidth: 140 },
      { id: "id", label: "ID", minWidth: 240 },
      { id: "actions", label: "Actions", minWidth: 120, align: "center" },
    ],
    [],
  )

  const defaultVisibleColumnIds = useMemo(
    () => ["companyName", "companyType", "companyEmail", "companyPhone", "companyStatus", "id", "actions"],
    [],
  )

  const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultVisibleColumnIds)
  useEffect(() => setVisibleColumns(defaultVisibleColumnIds), [defaultVisibleColumnIds])

  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({})
  useEffect(() => {
    const map: Record<string, boolean> = {}
    for (const col of columns) {
      map[col.id] = visibleColumns.includes(col.id)
    }
    setColumnVisibility(map)
  }, [columns, visibleColumns])

  const handleColumnVisibilityChange = useCallback((visibility: Record<string, boolean>) => {
    setColumnVisibility(visibility)
    const next = Object.entries(visibility)
      .filter(([_, isVisible]) => isVisible)
      .map(([key]) => key)
    setVisibleColumns(next)
  }, [])

  const visibleColumnConfigs = useMemo(() => columns.filter((c) => visibleColumns.includes(c.id)), [columns, visibleColumns])

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

  const paginated = useMemo(() => {
    const startIndex = page * rowsPerPage
    return filtered.slice(startIndex, startIndex + rowsPerPage)
  }, [filtered, page, rowsPerPage])

  const openCreate = () => {
    setSelectedId("")
    setModalMode("create")
    setOwnerInviteEmail("")
    setOwnerInviteLink("")
    setForm({
      companyName: "",
      legalName: "",
      companyType: "hospitality",
      companyWebsite: "",
      companyIndustry: "",
      companyStatus: "active",
      addressLine1: "",
      addressLine2: "",
      addressCity: "",
      addressPostcode: "",
      addressCountry: "",
      linkedClientId: "",
    })
    setModalOpen(true)
  }

  const openView = (companyId: string) => {
    const c = companies.find((x) => x.id === companyId)
    const addrParts = String(c?.companyAddress || "")
      .split("\n")
      .map((x) => x.trim())
    setSelectedId(companyId)
    setModalMode("view")
    setOwnerInviteEmail("")
    setOwnerInviteLink("")
    setForm({
      companyName: c?.companyName || "",
      legalName: c?.legalName || "",
      companyType: (c?.companyType || "hospitality") as CompanyType,
      companyWebsite: c?.companyWebsite || "",
      companyIndustry: c?.companyIndustry || "",
      companyStatus: c?.companyStatus || "active",
      addressLine1: addrParts[0] || "",
      addressLine2: addrParts[1] || "",
      addressCity: addrParts[2] || "",
      addressPostcode: addrParts[3] || "",
      addressCountry: addrParts[4] || "",
      linkedClientId: c?.linkedClientId || "",
    })
    setModalOpen(true)
  }

  const openEdit = (companyId: string) => {
    const c = companies.find((x) => x.id === companyId)
    const addrParts = String(c?.companyAddress || "")
      .split("\n")
      .map((x) => x.trim())
    setSelectedId(companyId)
    setModalMode("edit")
    setOwnerInviteEmail("")
    setOwnerInviteLink("")
    setForm({
      companyName: c?.companyName || "",
      legalName: c?.legalName || "",
      companyType: (c?.companyType || "hospitality") as CompanyType,
      companyWebsite: c?.companyWebsite || "",
      companyIndustry: c?.companyIndustry || "",
      companyStatus: c?.companyStatus || "active",
      addressLine1: addrParts[0] || "",
      addressLine2: addrParts[1] || "",
      addressCity: addrParts[2] || "",
      addressPostcode: addrParts[3] || "",
      addressCountry: addrParts[4] || "",
      linkedClientId: c?.linkedClientId || "",
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
    const companyAddress = [
      form.addressLine1,
      form.addressLine2,
      form.addressCity,
      form.addressPostcode,
      form.addressCountry,
    ]
      .map((x) => String(x || "").trim())
      .filter(Boolean)
      .join("\n")
    const payload = {
      companyName: form.companyName.trim(),
      legalName: (form.legalName || form.companyName).trim(),
      companyType: form.companyType,
      companyWebsite: form.companyWebsite,
      companyIndustry: form.companyIndustry,
      companyStatus: form.companyStatus,
      companyAddress,
      companyUpdated: nowIso,
      linkedClientId: form.linkedClientId || null,
    }

    if (modalMode === "create") {
      const newRef = push(ref(db, "companies"))
      const id = newRef.key || ""
      await set(newRef, { ...payload, companyCreated: nowIso, companyID: id, id })
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
    if (!window.confirm("Delete this company? This cannot be undone.")) return
    await remove(ref(db, `companies/${selectedId}`))
    setModalOpen(false)
  }

  const deleteById = async (companyId: string) => {
    if (!companyId) return
    if (!window.confirm("Delete this company? This cannot be undone.")) return
    await remove(ref(db, `companies/${companyId}`))
  }

  const migrateLegacyAdminCompanies = async () => {
    setMigrating(true)
    setMigrationNotice("")
    try {
      const legacySnap = await get(ref(db, "admin/companies"))
      const legacy = (legacySnap.val() || {}) as Record<string, any>
      const legacyIds = Object.keys(legacy || {})
      if (!legacy || legacyIds.length === 0) {
        setLegacyAdminCompaniesCount(0)
        return
      }

      // Only copy missing IDs to avoid overwriting existing companies.
      const updates: Record<string, any> = {}
      let copied = 0
      let skipped = 0
      Object.entries(legacy).forEach(([id, raw]) => {
        if (!id) return
        if (companies.some((c) => c.id === id)) {
          skipped += 1
          return
        }
        const nowIso = new Date().toISOString()
        updates[`companies/${id}`] = {
          ...(raw || {}),
          companyID: id,
          id,
          companyName: raw?.companyName || raw?.name || "Untitled",
          companyUpdated: raw?.companyUpdated || nowIso,
          companyCreated: raw?.companyCreated || nowIso,
        }
        copied += 1
      })
      if (Object.keys(updates).length > 0) {
        await update(ref(db), updates as any)
      }

      // Re-check legacy count to reflect reality in RTDB.
      try {
        const nextLegacySnap = await get(ref(db, "admin/companies"))
        const nextLegacy = nextLegacySnap.val() || {}
        setLegacyAdminCompaniesCount(Object.keys(nextLegacy || {}).length)
      } catch {
        setLegacyAdminCompaniesCount(legacyIds.length)
      }

      setMigrationNotice(`Migration complete. Copied: ${copied}. Skipped: ${skipped}.`)
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
        invitedBy: state.user?.uid || "",
        invitedByName: (state.user as any)?.displayName || "",
        invitedAt: now,
        expiresAt,
        setAsOwner: true,
      } as any)

      const link = `${window.location.origin}/JoinCompany?code=${encodeURIComponent(code)}`
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
    <AdminPageShell
      title={entityPlural}
      description="Company management now follows the shared admin shell, giving the upgraded company tools the same spacing, surfaces, and filtering rhythm as the rest of the app."
      metrics={[
        { label: entityPlural, value: companies.length, icon: <BusinessIcon fontSize="small" /> },
        { label: "Filtered results", value: filtered.length, icon: <BusinessIcon fontSize="small" /> },
        { label: "Linked CRM clients", value: crmClients.length, icon: <EditIcon fontSize="small" /> },
      ]}
      sx={{ height: "100%" }}
    >
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
      {migrationNotice ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          {migrationNotice}
        </Alert>
      ) : null}
      <DataHeader
        showDateControls={false}
        showDateTypeSelector={false}
        searchTerm={search}
        onSearchChange={(t) => {
          setSearch(t)
          setPage(0)
        }}
        searchPlaceholder="Search company name, email, phone, industry, ID…"
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded((p) => !p)}
        filters={[
          {
            label: "Type",
            options: [
              { id: "hospitality", name: "Hospitality" },
              { id: "supplier", name: "Supplier" },
              { id: "other", name: "Other" },
            ],
            selectedValues: typeFilter,
            onSelectionChange: (values) => {
              setTypeFilter(values as CompanyType[])
              setPage(0)
            },
          },
          {
            label: "Status",
            options: [
              { id: "active", name: "Active" },
              { id: "inactive", name: "Inactive" },
              { id: "trial", name: "Trial" },
              { id: "suspended", name: "Suspended" },
            ],
            selectedValues: statusFilter,
            onSelectionChange: (values) => {
              setStatusFilter(values)
              setPage(0)
            },
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
          setPage(0)
        }}
        columns={columns.map((c) => ({ key: c.id, label: c.label }))}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnVisibilityChange}
        onCreateNew={openCreate}
        createButtonLabel={createButtonLabel}
      />

      <AdminSectionCard flush sx={{ flex: 1, mt: 2 }}>
      <Paper
        sx={{
          width: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          boxShadow: "none",
          borderRadius: 0,
        }}
      >
        <TableContainer sx={{ flex: 1, overflow: "auto" }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {visibleColumnConfigs.map((column) => (
                  <TableCell key={column.id} align={(column.align as any) || "left"} sx={{ minWidth: column.minWidth }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      {column.label}
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.map((c) => (
                <TableRow
                  key={c.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => openView(c.id)}
                >
                  {visibleColumnConfigs.map((column) => {
                    if (column.id === "companyName") {
                      return (
                        <TableCell key={column.id}>
                          <Typography fontWeight={800}>{c.companyName || "—"}</Typography>
                        </TableCell>
                      )
                    }
                    if (column.id === "companyType") return <TableCell key={column.id}>{toPascalLabel(c.companyType)}</TableCell>
                    if (column.id === "companyEmail") return <TableCell key={column.id}>{c.companyEmail || "—"}</TableCell>
                    if (column.id === "companyPhone") return <TableCell key={column.id}>{c.companyPhone || "—"}</TableCell>
                    if (column.id === "companyStatus") return <TableCell key={column.id}>{toPascalLabel(c.companyStatus)}</TableCell>
                    if (column.id === "id") {
                      return (
                        <TableCell key={column.id}>
                          <Typography variant="caption" color="text.secondary">
                            {c.id}
                          </Typography>
                        </TableCell>
                      )
                    }
                    if (column.id === "actions") {
                      return (
                        <TableCell key={column.id} align="center" onClick={(e) => e.stopPropagation()}>
                          <Box sx={{ display: "inline-flex", gap: 0.5 }}>
                            <IconButton size="small" title="Edit" onClick={() => openEdit(c.id)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" title="Delete" onClick={() => void deleteById(c.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                      )
                    }
                    return <TableCell key={column.id}>—</TableCell>
                  })}
                </TableRow>
              ))}

              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumnConfigs.length} align="center" sx={{ py: 4 }}>
                    <EmptyStateCard
                      icon={BusinessIcon}
                      title={emptyTitle}
                      description={emptyDescription}
                      cardSx={{ maxWidth: 560, mx: "auto" }}
                    />
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ flexShrink: 0, borderTop: 1, borderColor: "divider" }}>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={filtered.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_e, newPage) => setPage(newPage)}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10))
              setPage(0)
            }}
          />
        </Box>
      </Paper>
      </AdminSectionCard>

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
          modalMode === "create"
            ? `Create ${entitySingular.toLowerCase()}`
            : modalMode === "edit"
              ? `Edit ${entitySingular.toLowerCase()}`
              : entitySingular
        }
        subtitle={selected ? `${selected.companyName} • ${selected.id}` : undefined}
        icon={<BusinessIcon />}
        mode={modalMode}
        onEdit={modalMode === "view" ? switchToEdit : undefined}
        onSave={async () => doSave()}
        saveButtonText={modalMode === "create" ? "Create" : "Save"}
        formRef={formRef as any}
        topBarActions={
          modalMode === "view" && selectedId ? (
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
          ) : null
        }
      >
        <Box>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                label="Company name"
                fullWidth
                required
                value={form.companyName}
                disabled={modalMode === "view"}
                onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Legal name"
                fullWidth
                value={form.legalName}
                disabled={modalMode === "view"}
                onChange={(e) => setForm((p) => ({ ...p, legalName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                label="Status"
                fullWidth
                value={form.companyStatus}
                disabled={modalMode === "view"}
                onChange={(e) => setForm((p) => ({ ...p, companyStatus: String(e.target.value) }))}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="trial">Trial</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                select
                label="Type"
                fullWidth
                value={form.companyType}
                disabled={modalMode === "view"}
                onChange={(e) => setForm((p) => ({ ...p, companyType: e.target.value as CompanyType }))}
              >
                <MenuItem value="hospitality">Hospitality</MenuItem>
                <MenuItem value="supplier">Supplier</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </TextField>
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

            <Grid item xs={12} md={4}>
              <TextField
                label="Website"
                fullWidth
                value={form.companyWebsite}
                disabled={modalMode === "view"}
                onChange={(e) => setForm((p) => ({ ...p, companyWebsite: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Address line 1"
                fullWidth
                value={form.addressLine1}
                disabled={modalMode === "view"}
                onChange={(e) => setForm((p) => ({ ...p, addressLine1: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Address line 2"
                fullWidth
                value={form.addressLine2}
                disabled={modalMode === "view"}
                onChange={(e) => setForm((p) => ({ ...p, addressLine2: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="City"
                fullWidth
                value={form.addressCity}
                disabled={modalMode === "view"}
                onChange={(e) => setForm((p) => ({ ...p, addressCity: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Country"
                fullWidth
                value={form.addressCountry}
                disabled={modalMode === "view"}
                onChange={(e) => setForm((p) => ({ ...p, addressCountry: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Postcode"
                fullWidth
                value={form.addressPostcode}
                disabled={modalMode === "view"}
                onChange={(e) => setForm((p) => ({ ...p, addressPostcode: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Autocomplete
                options={crmClients}
                getOptionLabel={(o) => o.name}
                value={crmClients.find((c) => c.id === form.linkedClientId) || null}
                onChange={(_e, v) => setForm((p) => ({ ...p, linkedClientId: v?.id || "" }))}
                disabled={modalMode === "view"}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                renderInput={(params) => (
                  <TextField {...params} label="Link to client" placeholder="Search CRM clients…" />
                )}
              />
            </Grid>

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
    </AdminPageShell>
  )
}
