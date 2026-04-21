import { alpha } from "@mui/material/styles"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from "@mui/material"
import { Delete as DeleteIcon, Edit as EditIcon, Business as BusinessIcon } from "@mui/icons-material"
import { themeConfig } from "../../../app/backend/context/AppTheme"
import { db, get, onValue, push, ref, set, update } from "../../backend/services/Firebase"
import DataHeader from "../../../app/frontend/components/reusable/DataHeader"
import CRUDModal, {
  type CRUDModalCloseReason,
  isCrudModalHardDismiss,
  removeWorkspaceFormDraft,
} from "../../../app/frontend/components/reusable/CRUDModal"
import EmptyStateCard from "../../../app/frontend/components/reusable/EmptyStateCard"
import ClientCRUDForm, { type ClientCRUDFormHandle } from "./forms/ClientCRUDForm"
import type { CRMClient, CRMClientStatus, CRMContact, CustomFieldDefinition } from "./types"
import ActivityComposer from "../shared/ActivityComposer"
import ActivityTimeline from "../shared/ActivityTimeline"
import { createActivity, nowMs, rootUpdate } from "../shared/rtdb"
import { useLocation, useNavigate } from "react-router-dom"

type ColumnConfig = {
  id: string
  label: string
  minWidth?: number
  align?: "left" | "right" | "center"
}

type ClientsProps = {
  fields: CustomFieldDefinition[]
}

const Clients: React.FC<ClientsProps> = ({ fields }) => {
  const location = useLocation()
  const navigate = useNavigate()

  const getParam = (params: URLSearchParams, key: string) => params.get(key) ?? params.get(key.charAt(0).toLowerCase() + key.slice(1))

  const setCanonicalParam = (params: URLSearchParams, key: string, value: string) => {
    params.set(key, value)
    params.delete(key.charAt(0).toLowerCase() + key.slice(1))
  }

  const deleteCanonicalParam = (params: URLSearchParams, key: string) => {
    params.delete(key)
    params.delete(key.charAt(0).toLowerCase() + key.slice(1))
  }
  const [clients, setClients] = useState<CRMClient[]>([])
  const [contacts, setContacts] = useState<CRMContact[]>([])
  const [search, setSearch] = useState("")
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [statusFilter, setStatusFilter] = useState<CRMClientStatus[]>([])
  const [sortValue, setSortValue] = useState<"updatedAt" | "name">("updatedAt")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  // CRUD modal
  const [crudOpen, setCrudOpen] = useState(false)
  const [crudMode, setCrudMode] = useState<"create" | "edit" | "view">("create")
  const [selectedClient, setSelectedClient] = useState<CRMClient | null>(null)
  const clientFormRef = useRef<ClientCRUDFormHandle | null>(null)

  // Delete confirm
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<CRMClient | null>(null)

  useEffect(() => {
    const clientsRef = ref(db, `admin/crm/clients`)
    const unsub = onValue(
      clientsRef,
      (snap) => {
        const val = snap.val() || {}
        const rows: CRMClient[] = Object.entries(val).map(([id, raw]: any) => ({
          id,
          name: raw?.name || raw?.companyName || "",
          email: raw?.email || "",
          phone: raw?.phone || "",
          website: raw?.website || "",
          industry: raw?.industry || "",
          status: (raw?.status as CRMClientStatus) || "active",
          address: raw?.address || "",
          tags: Array.isArray(raw?.tags) ? raw.tags : [],
          notes: raw?.notes || "",
          custom: raw?.custom && typeof raw.custom === "object" ? raw.custom : {},
          createdAt: raw?.createdAt || Date.now(),
          updatedAt: raw?.updatedAt || Date.now(),
        }))
        rows.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
        setClients(rows)
      },
      () => {},
    )
    return () => unsub()
  }, [])

  // For “linked contacts” counts
  useEffect(() => {
    const contactsRef = ref(db, `admin/crm/contacts`)
    const unsub = onValue(
      contactsRef,
      (snap) => {
        const val = snap.val() || {}
        const rows: CRMContact[] = Object.entries(val).map(([id, raw]: any) => ({
          id,
          name: raw?.name || "",
          email: raw?.email || "",
          phone: raw?.phone || "",
          status: (raw?.status as any) || "lead",
          clientId: raw?.clientId || raw?.companyId || undefined,
          tags: Array.isArray(raw?.tags) ? raw.tags : [],
          notes: raw?.notes || "",
          custom: raw?.custom && typeof raw.custom === "object" ? raw.custom : {},
          createdAt: raw?.createdAt || Date.now(),
          updatedAt: raw?.updatedAt || Date.now(),
        }))
        setContacts(rows)
      },
      () => {},
    )
    return () => unsub()
  }, [])

  const contactsCountByClientId = useMemo(() => {
    const map: Record<string, number> = {}
    for (const c of contacts) {
      if (!c.clientId) continue
      map[c.clientId] = (map[c.clientId] || 0) + 1
    }
    return map
  }, [contacts])

  const columns: ColumnConfig[] = useMemo(
    () => [
      { id: "name", label: "Company", minWidth: 240 },
      { id: "status", label: "Status", minWidth: 140, align: "center" },
      { id: "industry", label: "Industry", minWidth: 180 },
      { id: "website", label: "Website", minWidth: 200 },
      { id: "tags", label: "Tags", minWidth: 220 },
      { id: "contacts", label: "Contacts", minWidth: 120, align: "center" },
      { id: "updatedAt", label: "Updated", minWidth: 170 },
      { id: "actions", label: "Actions", minWidth: 120, align: "center" },
    ],
    [],
  )

  const defaultVisibleColumnIds = useMemo(
    () => columns.map((c) => c.id),
    [columns],
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

  const visibleColumnConfigs = useMemo(
    () => columns.filter((c) => visibleColumns.includes(c.id)),
    [columns, visibleColumns],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = clients.filter((c) => {
      if (statusFilter.length > 0 && !statusFilter.includes((c.status || "active") as CRMClientStatus)) return false
      if (!q) return true
      const tags = (c.tags || []).join(" ").toLowerCase()
      return (
        String(c.name || "").toLowerCase().includes(q) ||
        String(c.industry || "").toLowerCase().includes(q) ||
        String(c.website || "").toLowerCase().includes(q) ||
        tags.includes(q) ||
        String(c.id || "").toLowerCase().includes(q)
      )
    })

    const dir = sortDirection === "asc" ? 1 : -1
    return [...base].sort((a, b) => {
      if (sortValue === "name") return String(a.name || "").localeCompare(String(b.name || "")) * dir
      return (Number(a.updatedAt || 0) - Number(b.updatedAt || 0)) * dir
    })
  }, [clients, search, sortDirection, sortValue, statusFilter])

  const paginated = useMemo(() => {
    const startIndex = page * rowsPerPage
    return filtered.slice(startIndex, startIndex + rowsPerPage)
  }, [filtered, page, rowsPerPage])

  const openCreate = useCallback(() => {
    setSelectedClient(null)
    setCrudMode("create")
    setCrudOpen(true)
  }, [])

  const openView = useCallback((c: CRMClient) => {
    setSelectedClient(c)
    setCrudMode("view")
    setCrudOpen(true)

    const params = new URLSearchParams(location.search || "")
    setCanonicalParam(params, "ClientId", c.id)
    navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true })
  }, [location.pathname, location.search, navigate])

  const openEdit = useCallback((c: CRMClient) => {
    setSelectedClient(c)
    setCrudMode("edit")
    setCrudOpen(true)
  }, [])

  const resetCrudStateAndUrl = useCallback(() => {
    setSelectedClient(null)
    setCrudMode("create")

    const params = new URLSearchParams(location.search || "")
    if (getParam(params, "ClientId")) {
      deleteCanonicalParam(params, "ClientId")
      const next = params.toString()
      navigate({ pathname: location.pathname, search: next ? `?${next}` : "" }, { replace: true })
    }
  }, [location.pathname, location.search, navigate])

  const handleCrudModalClose = useCallback(
    (reason?: CRUDModalCloseReason) => {
      setCrudOpen(false)
      if (isCrudModalHardDismiss(reason)) {
        resetCrudStateAndUrl()
      }
    },
    [resetCrudStateAndUrl],
  )

  // Deep-link: /CRM?tab=clients&clientId=...
  useEffect(() => {
    const params = new URLSearchParams(location.search || "")
    const clientId = String(getParam(params, "ClientId") || "").trim()
    if (!clientId) return
    if (crudOpen) return
    const found = clients.find((c) => c.id === clientId)
    if (found) openView(found)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, crudOpen, location.search])

  const saveClient = useCallback(
    async (payload: {
      name: string
      email: string
      phone: string
      website: string
      industry: string
      status: CRMClientStatus
      address: string
      tags: string[]
      notes: string
      custom: Record<string, any>
    }) => {
      const now = nowMs()
      const modeSnapshot = crudMode

      const safePayload = Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined)) as typeof payload
      if (selectedClient && crudMode === "edit") {
        await update(ref(db, `admin/crm/clients/${selectedClient.id}`), { ...safePayload, updatedAt: now })
        await createActivity({
          type: "system",
          title: "Client updated",
          body: `${safePayload.name}`,
          clientId: selectedClient.id,
          createdAt: now,
          updatedAt: now,
        } as any)
        removeWorkspaceFormDraft(location.pathname, {
          crudEntity: "crmClient",
          crudMode: modeSnapshot,
          id: selectedClient.id,
          itemLabel: safePayload.name,
        })
        setCrudOpen(false)
        resetCrudStateAndUrl()
        return
      }

      const newRef = push(ref(db, `admin/crm/clients`))
      await set(newRef, { ...safePayload, createdAt: now, updatedAt: now })
      const newId = newRef.key || ""
      if (newId) {
        await createActivity({
          type: "system",
          title: "Client created",
          body: `${safePayload.name}`,
          clientId: newId,
          createdAt: now,
          updatedAt: now,
        } as any)
      }
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "crmClient",
        crudMode: modeSnapshot,
        id: newId || undefined,
        itemLabel: safePayload.name,
      })
      setCrudOpen(false)
      resetCrudStateAndUrl()
    },
    [crudMode, resetCrudStateAndUrl, selectedClient, location.pathname],
  )

  const askDelete = useCallback((c: CRMClient) => {
    setClientToDelete(c)
    setDeleteConfirmOpen(true)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!clientToDelete?.id) return
    const clientId = clientToDelete.id
    const now = nowMs()
    const [contactsSnap, oppsSnap, projectsSnap, tasksSnap, eventsSnap] = await Promise.all([
      get(ref(db, "admin/crm/contacts")),
      get(ref(db, "admin/crm/opportunities")),
      get(ref(db, "admin/projects")),
      get(ref(db, "admin/tasks")),
      get(ref(db, "admin/calendar/events")),
    ])

    const updates: Record<string, any> = {
      [`admin/crm/clients/${clientId}`]: null,
      [`admin/calendar/links/client/${clientId}`]: null,
      [`admin/activityBy/client/${clientId}`]: null,
    }

    Object.entries(contactsSnap.val() || {}).forEach(([id, raw]: any) => {
      if (String(raw?.clientId || raw?.companyId || "") !== clientId) return
      updates[`admin/crm/contacts/${id}/clientId`] = ""
      updates[`admin/crm/contacts/${id}/updatedAt`] = now
    })

    Object.entries(oppsSnap.val() || {}).forEach(([id, raw]: any) => {
      if (String(raw?.clientId || "") !== clientId) return
      updates[`admin/crm/opportunities/${id}/clientId`] = ""
      updates[`admin/crm/opportunities/${id}/updatedAt`] = now
    })

    Object.entries(projectsSnap.val() || {}).forEach(([id, raw]: any) => {
      if (String(raw?.clientId || "") !== clientId) return
      updates[`admin/projects/${id}/clientId`] = ""
      updates[`admin/projects/${id}/updatedAt`] = now
      updates[`admin/index/projectsByClient/${clientId}/${id}`] = null
    })

    Object.entries(tasksSnap.val() || {}).forEach(([id, raw]: any) => {
      if (String(raw?.clientId || "") !== clientId) return
      updates[`admin/tasks/${id}/clientId`] = ""
      updates[`admin/tasks/${id}/updatedAt`] = now
      updates[`admin/index/tasksByClient/${clientId}/${id}`] = null
    })

    Object.entries(eventsSnap.val() || {}).forEach(([id, raw]: any) => {
      if (String(raw?.clientId || "") !== clientId) return
      updates[`admin/calendar/events/${id}/clientId`] = ""
      updates[`admin/calendar/events/${id}/updatedAt`] = now
    })

    await rootUpdate(updates)
    setDeleteConfirmOpen(false)
    setClientToDelete(null)
  }, [clientToDelete])

  return (
    <Box sx={{ p: 0 }}>
      <DataHeader
        showDateControls={false}
        showDateTypeSelector={false}
        searchTerm={search}
        onSearchChange={(t) => {
          setSearch(t)
          setPage(0)
        }}
        searchPlaceholder="Search company, industry, website, tags…"
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded((p) => !p)}
        filters={[
          {
            label: "Status",
            options: [
              { id: "active", name: "active" },
              { id: "inactive", name: "inactive" },
              { id: "trial", name: "trial" },
              { id: "suspended", name: "suspended" },
            ],
            selectedValues: statusFilter as any,
            onSelectionChange: (values) => {
              setStatusFilter(values as any)
              setPage(0)
            },
          },
        ]}
        sortOptions={[
          { value: "updatedAt", label: "Last Updated" },
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
        createButtonLabel="Add Client"
      />

      <Paper
        sx={{
          width: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          height: "calc(100vh - 300px)",
          minHeight: 400,
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
                <TableRow key={c.id} hover sx={{ cursor: "pointer" }} onClick={() => openView(c)}>
                  {visibleColumnConfigs.map((column) => {
                    if (column.id === "name") {
                      return (
                        <TableCell key={column.id}>
                          <Typography fontWeight={800}>{c.name || "—"}</Typography>
                        </TableCell>
                      )
                    }
                    if (column.id === "status") {
                      return (
                        <TableCell key={column.id} align="center" sx={{ textTransform: "capitalize" }}>
                          {c.status || "—"}
                        </TableCell>
                      )
                    }
                    if (column.id === "industry") return <TableCell key={column.id}>{c.industry || "—"}</TableCell>
                    if (column.id === "website") return <TableCell key={column.id}>{c.website || "—"}</TableCell>
                    if (column.id === "tags") {
                      return (
                        <TableCell key={column.id}>
                          {(c.tags || []).slice(0, 3).map((t) => (
                            <Chip key={t} size="small" label={t} sx={{ mr: 0.5 }} />
                          ))}
                          {(c.tags || []).length > 3 ? <Chip size="small" label={`+${(c.tags || []).length - 3}`} /> : null}
                        </TableCell>
                      )
                    }
                    if (column.id === "contacts") {
                      return <TableCell key={column.id} align="center">{contactsCountByClientId[c.id] || 0}</TableCell>
                    }
                    if (column.id === "updatedAt") {
                      return <TableCell key={column.id}>{new Date(c.updatedAt || 0).toLocaleString()}</TableCell>
                    }
                    if (column.id === "actions") {
                      return (
                        <TableCell key={column.id} align="center" onClick={(e) => e.stopPropagation()}>
                          <Box sx={{ display: "inline-flex", gap: 0.5 }}>
                            <IconButton size="small" title="Edit" onClick={() => openEdit(c)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" title="Delete" onClick={() => askDelete(c)}>
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
                      title="No clients found"
                      description="Create your first client, or adjust your search/filters."
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

      <CRUDModal
        open={crudOpen}
        onClose={handleCrudModalClose}
        workspaceFormShortcut={{
          crudEntity: "crmClient",
          crudMode,
          id: selectedClient?.id,
          itemLabel: selectedClient?.name || undefined,
        }}
        title={crudMode === "create" ? "Create client" : crudMode === "edit" ? "Edit client" : "Client details"}
        mode={crudMode}
        onSave={() => clientFormRef.current?.submit()}
        onEdit={() => setCrudMode("edit")}
        saveButtonText={crudMode === "create" ? "Create" : "Save"}
        topBarActions={
          crudMode === "view" && selectedClient?.id ? (
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                sx={{
                  bgcolor: alpha(themeConfig.brandColors.offWhite, 0.1),
                  color: "inherit",
                  borderColor: alpha(themeConfig.brandColors.offWhite, 0.3),
                  "&:hover": {
                    bgcolor: alpha(themeConfig.brandColors.offWhite, 0.2),
                    borderColor: alpha(themeConfig.brandColors.offWhite, 0.5),
                  },
                }}
                onClick={() => navigate(`/CRM/Client360/${encodeURIComponent(selectedClient.id)}`)}
              >
                Open 360
              </Button>
              <Button
                size="small"
                variant="outlined"
                sx={{
                  bgcolor: alpha(themeConfig.brandColors.offWhite, 0.1),
                  color: "inherit",
                  borderColor: alpha(themeConfig.brandColors.offWhite, 0.3),
                  "&:hover": {
                    bgcolor: alpha(themeConfig.brandColors.offWhite, 0.2),
                    borderColor: alpha(themeConfig.brandColors.offWhite, 0.5),
                  },
                }}
                onClick={() => setCrudMode("edit")}
              >
                Edit
              </Button>
            </Box>
          ) : null
        }
      >
        <ClientCRUDForm
          ref={clientFormRef}
          client={selectedClient}
          mode={crudMode}
          fields={fields}
          contacts={contacts}
          onSave={saveClient}
        />

        {selectedClient?.id ? (
          <Box sx={{ mt: 2, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
            <ActivityComposer entityType="client" entityId={selectedClient.id} defaultTitle="Note" />
            <ActivityTimeline entityType="client" entityId={selectedClient.id} title="Timeline" />
          </Box>
        ) : null}
      </CRUDModal>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Delete client <strong>{clientToDelete?.name || "—"}</strong>? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Close</Button>
          <Button variant="contained" color="error" onClick={confirmDelete} disabled={!clientToDelete?.id}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Clients
