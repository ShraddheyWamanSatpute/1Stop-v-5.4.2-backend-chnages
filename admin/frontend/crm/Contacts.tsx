import { themeConfig } from "../../../app/backend/context/AppTheme"
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
import { useLocation, useNavigate } from "react-router-dom"
import {
  CalendarMonth as CalendarIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
} from "@mui/icons-material"
import { db, get, onValue, push, ref, set, update } from "../../backend/services/Firebase"
import DataHeader from "../../../app/frontend/components/reusable/DataHeader"
import CRUDModal, {
  type CRUDModalCloseReason,
  isCrudModalHardDismiss,
  removeWorkspaceFormDraft,
} from "../../../app/frontend/components/reusable/CRUDModal"
import EmptyStateCard from "../../../app/frontend/components/reusable/EmptyStateCard"
import ContactCRUDForm, { type ContactCRUDFormHandle } from "./forms/ContactCRUDForm"
import type { CRMClient, CRMContact, CRMContactStatus, CustomFieldDefinition } from "./types"
import { DEFAULT_CRM_STATUS } from "./types"
import ActivityComposer from "../shared/ActivityComposer"
import ActivityTimeline from "../shared/ActivityTimeline"
import { createActivity, nowMs, rootUpdate } from "../shared/rtdb"

export type { CRMContact, CRMContactStatus, CustomFieldDefinition } from "./types"

interface ContactsProps {
  fields: CustomFieldDefinition[]
}

type ColumnConfig = {
  id: string
  label: string
  minWidth?: number
  align?: "left" | "right" | "center"
}

const Contacts: React.FC<ContactsProps> = ({ fields }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const [, setLoading] = useState(false)
  const [contacts, setContacts] = useState<CRMContact[]>([])
  const [clients, setClients] = useState<Array<Pick<CRMClient, "id" | "name">>>([])
  const [search, setSearch] = useState("")
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [statusFilter, setStatusFilter] = useState<CRMContactStatus[]>([])
  const [sortValue, setSortValue] = useState<"updatedAt" | "name">("updatedAt")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  // CRUD modal
  const [crudOpen, setCrudOpen] = useState(false)
  const [crudMode, setCrudMode] = useState<"create" | "edit" | "view">("create")
  const [selectedContact, setSelectedContact] = useState<CRMContact | null>(null)
  const contactFormRef = useRef<ContactCRUDFormHandle | null>(null)

  // Delete confirm
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [contactToDelete, setContactToDelete] = useState<CRMContact | null>(null)

  useEffect(() => {
    setLoading(true)
    const contactsRef = ref(db, `admin/crm/contacts`)
    const unsubscribe = onValue(
      contactsRef,
      (snap) => {
        const val = snap.val() || {}
        const rows: CRMContact[] = Object.entries(val).map(([id, raw]: any) => ({
          id,
          name: raw?.name || "",
          email: raw?.email || "",
          phone: raw?.phone || "",
          status: (raw?.status as CRMContactStatus) || DEFAULT_CRM_STATUS,
          clientId: raw?.clientId || raw?.companyId || undefined,
          tags: Array.isArray(raw?.tags) ? raw.tags : [],
          notes: raw?.notes || "",
          custom: raw?.custom && typeof raw.custom === "object" ? raw.custom : {},
          createdAt: raw?.createdAt || Date.now(),
          updatedAt: raw?.updatedAt || Date.now(),
        }))
        rows.sort((a, b) => b.updatedAt - a.updatedAt)
        setContacts(rows)
        setLoading(false)
      },
      () => setLoading(false),
    )
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const clientsRef = ref(db, `admin/crm/clients`)
    const unsub = onValue(clientsRef, (snap) => {
      const val = snap.val() || {}
      const rows: Array<Pick<CRMClient, "id" | "name">> = Object.entries(val).map(([id, raw]: any) => ({
        id,
        name: raw?.name || raw?.companyName || "",
      }))
      rows.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
      setClients(rows)
    })
    return () => unsub()
  }, [])

  const clientNameById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const c of clients) map[c.id] = c.name || c.id
    return map
  }, [clients])


  const columns: ColumnConfig[] = useMemo(() => {
    const showFields = (fields || []).filter((f) => (f.appliesTo || "both") !== "clients" && f.showInTable)
    return [
      { id: "firstName", label: "First Name", minWidth: 160 },
      { id: "lastName", label: "Last Name", minWidth: 160 },
      { id: "email", label: "Email", minWidth: 200 },
      { id: "phone", label: "Phone", minWidth: 150 },
      { id: "client", label: "Client", minWidth: 220 },
      { id: "status", label: "Type", minWidth: 120, align: "center" },
      { id: "tags", label: "Tags", minWidth: 200 },
      ...showFields.map((f) => ({ id: `custom:${f.id}`, label: f.label, minWidth: 160 } as ColumnConfig)),
      { id: "updatedAt", label: "Updated", minWidth: 170 },
      { id: "actions", label: "Actions", minWidth: 170, align: "center" },
    ]
  }, [fields])

  const defaultVisibleColumnIds = useMemo(() => {
    const showFields = (fields || []).filter((f) => (f.appliesTo || "both") !== "clients" && f.showInTable).map((f) => `custom:${f.id}`)
    return ["firstName", "lastName", "email", "phone", "client", "status", "tags", ...showFields, "updatedAt", "actions"]
  }, [fields])

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
    const base = contacts.filter((c) => {
      if (statusFilter.length > 0 && !statusFilter.includes(c.status)) return false
      if (!q) return true
      const full = String(c.name || "").trim()
      const parts = full ? full.split(/\s+/).filter(Boolean) : []
      const firstName = String(parts[0] || "").toLowerCase()
      const lastName = String(parts.slice(1).join(" ") || "").toLowerCase()
      const tags = (c.tags || []).join(" ").toLowerCase()
      const clientName = c.clientId ? String(clientNameById[c.clientId] || "").toLowerCase() : ""
      const customText = Object.values(c.custom || {})
        .map((v) => (typeof v === "string" || typeof v === "number" ? String(v) : ""))
        .join(" ")
        .toLowerCase()
      return (
        firstName.includes(q) ||
        lastName.includes(q) ||
        full.toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q) ||
        c.status.toLowerCase().includes(q) ||
        clientName.includes(q) ||
        tags.includes(q) ||
        customText.includes(q)
      )
    })

    const dir = sortDirection === "asc" ? 1 : -1
    return [...base].sort((a, b) => {
      if (sortValue === "name") return a.name.localeCompare(b.name) * dir
      return (Number(a.updatedAt || 0) - Number(b.updatedAt || 0)) * dir
    })
  }, [contacts, search, statusFilter, sortValue, sortDirection, clientNameById])

  const paginated = useMemo(() => {
    const startIndex = page * rowsPerPage
    return filtered.slice(startIndex, startIndex + rowsPerPage)
  }, [filtered, page, rowsPerPage])

  const openCreate = useCallback(() => {
    setSelectedContact(null)
    setCrudMode("create")
    setCrudOpen(true)
  }, [])

  const openView = useCallback((c: CRMContact) => {
    setSelectedContact(c)
    setCrudMode("view")
    setCrudOpen(true)
  }, [])

  const openEdit = useCallback((c: CRMContact) => {
    setSelectedContact(c)
    setCrudMode("edit")
    setCrudOpen(true)
  }, [])

  const resetCrudEntity = useCallback(() => {
    setSelectedContact(null)
    setCrudMode("create")
  }, [])

  const handleCrudModalClose = useCallback(
    (reason?: CRUDModalCloseReason) => {
      setCrudOpen(false)
      if (isCrudModalHardDismiss(reason)) {
        resetCrudEntity()
      }
    },
    [resetCrudEntity],
  )

  const saveContact = useCallback(
    async (payload: {
      name: string
      email: string
      phone: string
      status: CRMContactStatus
      clientId?: string
      tags: string[]
      notes: string
      custom: Record<string, any>
    }) => {
      const now = nowMs()
      const modeSnapshot = crudMode

      const safePayload = Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined)) as typeof payload

      if (selectedContact && crudMode === "edit") {
        await update(ref(db, `admin/crm/contacts/${selectedContact.id}`), {
          ...safePayload,
          updatedAt: now,
        })
        await createActivity({
          type: "system",
          title: "Contact updated",
          body: `${safePayload.name}`,
          contactId: selectedContact.id,
          clientId: safePayload.clientId,
          createdAt: now,
          updatedAt: now,
        } as any)
        removeWorkspaceFormDraft(location.pathname, {
          crudEntity: "crmContact",
          crudMode: modeSnapshot,
          id: selectedContact.id,
          itemLabel: safePayload.name,
        })
        setCrudOpen(false)
        resetCrudEntity()
        return
      }

      const newRef = push(ref(db, `admin/crm/contacts`))
      await set(newRef, {
        ...safePayload,
        createdAt: now,
        updatedAt: now,
      })
      const newId = newRef.key || ""
      if (newId) {
        await createActivity({
          type: "system",
          title: "Contact created",
          body: `${safePayload.name}`,
          contactId: newId,
          clientId: safePayload.clientId,
          createdAt: now,
          updatedAt: now,
        } as any)
      }
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "crmContact",
        crudMode: modeSnapshot,
        id: newId || undefined,
        itemLabel: safePayload.name,
      })
      setCrudOpen(false)
      resetCrudEntity()
    },
    [crudMode, resetCrudEntity, selectedContact, location.pathname],
  )


  const askDelete = useCallback((c: CRMContact) => {
    setContactToDelete(c)
    setDeleteConfirmOpen(true)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!contactToDelete?.id) return
    const contactId = contactToDelete.id
    const now = nowMs()
    const [eventsSnap] = await Promise.all([
      get(ref(db, "admin/calendar/events")),
    ])

    const updates: Record<string, any> = {
      [`admin/crm/contacts/${contactId}`]: null,
      [`admin/calendar/links/contact/${contactId}`]: null,
      [`admin/activityBy/contact/${contactId}`]: null,
    }

    Object.entries(eventsSnap.val() || {}).forEach(([id, raw]: any) => {
      if (String(raw?.contactId || "") !== contactId) return
      updates[`admin/calendar/events/${id}/contactId`] = ""
      updates[`admin/calendar/events/${id}/updatedAt`] = now
    })

    await rootUpdate(updates)
    setDeleteConfirmOpen(false)
    setContactToDelete(null)
  }, [contactToDelete])

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
        searchPlaceholder="Search first name, last name, email, phone, tags, type, custom fields…"
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded((p) => !p)}
        filters={[
          {
            label: "Status",
            options: [
              { id: "lead", name: "lead" },
              { id: "active", name: "active" },
              { id: "past", name: "past" },
              { id: "blocked", name: "blocked" },
            ],
            selectedValues: statusFilter,
            onSelectionChange: (values) => setStatusFilter(values as CRMContactStatus[]),
          },
        ]}
        sortOptions={[
          { value: "updatedAt", label: "Last Updated" },
          { value: "name", label: "Name" },
        ]}
        sortValue={sortValue}
        sortDirection={sortDirection}
        onSortChange={(value, direction) => {
          setSortValue(value as "updatedAt" | "name")
          setSortDirection(direction)
          setPage(0)
        }}
        columns={columns.map((c) => ({ key: c.id, label: c.label }))}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnVisibilityChange}
        onCreateNew={openCreate}
        createButtonLabel="Add Contact"
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
                  <TableCell
                    key={column.id}
                    align={(column.align as any) || "left"}
                    sx={{
                      minWidth: column.minWidth,
                      cursor: column.id === "name" || column.id === "updatedAt" ? "pointer" : "default",
                      userSelect: "none",
                      "&:hover": {
                        backgroundColor:
                          column.id === "name" || column.id === "updatedAt" ? "rgba(0, 0, 0, 0.04)" : "transparent",
                      },
                    }}
                    onClick={() => {
                      if (column.id !== "name" && column.id !== "updatedAt") return
                      const nextSort = column.id === "name" ? "name" : "updatedAt"
                      if (sortValue === nextSort) {
                        setSortDirection((p) => (p === "asc" ? "desc" : "asc"))
                      } else {
                        setSortValue(nextSort)
                        setSortDirection("asc")
                      }
                      setPage(0)
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        {column.label}
                      </Typography>
                      {(column.id === "name" && sortValue === "name") ||
                      (column.id === "updatedAt" && sortValue === "updatedAt") ? (
                        <Box sx={{ opacity: 0.7 }}>{sortDirection === "asc" ? "↑" : "↓"}</Box>
                      ) : null}
                    </Box>
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
                  onClick={() => openView(c)}
                >
                  {visibleColumnConfigs.map((column) => {
                    if (column.id === "firstName") {
                      const full = String(c.name || "").trim()
                      const parts = full ? full.split(/\s+/).filter(Boolean) : []
                      const first = parts[0] || ""
                      return (
                        <TableCell key={column.id}>
                          <Typography fontWeight={800}>{first || "—"}</Typography>
                        </TableCell>
                      )
                    }
                    if (column.id === "lastName") {
                      const full = String(c.name || "").trim()
                      const parts = full ? full.split(/\s+/).filter(Boolean) : []
                      const last = parts.slice(1).join(" ")
                      return <TableCell key={column.id}>{last || "—"}</TableCell>
                    }
                    if (column.id === "email") return <TableCell key={column.id}>{c.email || "—"}</TableCell>
                    if (column.id === "phone") return <TableCell key={column.id}>{c.phone || "—"}</TableCell>
                    if (column.id === "client") {
                      const name = c.clientId ? clientNameById[c.clientId] : ""
                      return <TableCell key={column.id}>{name || "—"}</TableCell>
                    }
                    if (column.id === "status") {
                      return (
                        <TableCell key={column.id} align="center">
                          <Chip
                            size="small"
                            label={c.status}
                            color={
                              c.status === "active"
                                ? "success"
                                : c.status === "lead"
                                  ? "primary"
                                  : c.status === "blocked"
                                    ? "error"
                                    : "default"
                            }
                          />
                        </TableCell>
                      )
                    }
                    if (column.id === "tags") {
                      const tags = c.tags || []
                      return (
                        <TableCell key={column.id}>
                          {tags.slice(0, 3).map((t) => (
                            <Chip key={t} size="small" label={t} sx={{ mr: 0.5 }} />
                          ))}
                          {tags.length > 3 ? <Chip size="small" label={`+${tags.length - 3}`} /> : null}
                        </TableCell>
                      )
                    }
                    if (column.id.startsWith("custom:")) {
                      const id = column.id.slice("custom:".length)
                      const v = (c.custom || {})[id]
                      const display =
                        Array.isArray(v) ? v.join(", ") : typeof v === "boolean" ? (v ? "Yes" : "No") : (v ?? "")
                      return <TableCell key={column.id}>{display || "—"}</TableCell>
                    }
                    if (column.id === "updatedAt") {
                      return <TableCell key={column.id}>{new Date(c.updatedAt || 0).toLocaleString()}</TableCell>
                    }
                    if (column.id === "actions") {
                      return (
                        <TableCell key={column.id} align="center" onClick={(e) => e.stopPropagation()}>
                          <Box sx={{ display: "inline-flex", gap: 0.5 }}>
                            <IconButton
                              size="small"
                              title="Schedule meeting"
                              onClick={() => navigate(`/Calendar?create=1&contactId=${encodeURIComponent(c.id)}`)}
                            >
                              <CalendarIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              title="Email"
                              disabled={!c.email}
                              onClick={() => window.open(`mailto:${encodeURIComponent(String(c.email || ""))}`, "_self")}
                            >
                              <EmailIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              title="Call"
                              disabled={!c.phone}
                              onClick={() => window.open(`tel:${String(c.phone || "").trim()}`, "_self")}
                            >
                              <PhoneIcon fontSize="small" />
                            </IconButton>
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
                      icon={PersonIcon}
                      title="No contacts found"
                      description="Try adjusting your search or filters."
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
          crudEntity: "crmContact",
          crudMode,
          id: selectedContact?.id,
          itemLabel: selectedContact?.name || undefined,
        }}
        title={
          crudMode === "create" ? "Create Contact" : crudMode === "edit" ? "Edit Contact" : "Contact"
        }
        subtitle={selectedContact?.id ? `Contact: ${selectedContact.id}` : undefined}
        icon={<CalendarIcon />}
        mode={crudMode}
        onEdit={crudMode === "view" && selectedContact ? () => setCrudMode("edit") : undefined}
        onSave={
          crudMode === "view"
            ? undefined
            : async () => {
                await Promise.resolve(contactFormRef.current?.submit())
              }
        }
        formRef={contactFormRef as any}
        topBarActions={
          selectedContact?.id && crudMode !== "create" ? (
            <Button
              size="small"
              variant="outlined"
              startIcon={<CalendarIcon />}
              onClick={() => navigate(`/Calendar?create=1&contactId=${encodeURIComponent(selectedContact.id)}`)}
              sx={{
                bgcolor: alpha(themeConfig.brandColors.offWhite, 0.1),
                color: "inherit",
                borderColor: alpha(themeConfig.brandColors.offWhite, 0.3),
                "&:hover": {
                  bgcolor: alpha(themeConfig.brandColors.offWhite, 0.2),
                  borderColor: alpha(themeConfig.brandColors.offWhite, 0.5),
                },
              }}
            >
              Schedule meeting
            </Button>
          ) : null
        }
      >
        <ContactCRUDForm
          ref={contactFormRef}
          contact={selectedContact}
          mode={crudMode}
          fields={fields}
          clients={clients}
          onSave={saveContact}
        />

        {selectedContact?.id ? (
          <Box sx={{ mt: 2, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
            <ActivityComposer entityType="contact" entityId={selectedContact.id} defaultTitle="Note" />
            <ActivityTimeline entityType="contact" entityId={selectedContact.id} title="Timeline" />
          </Box>
        ) : null}
      </CRUDModal>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Delete contact <strong>{contactToDelete?.name || "—"}</strong>? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Close</Button>
          <Button variant="contained" color="error" onClick={confirmDelete} disabled={!contactToDelete?.id}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  )
};

export default Contacts
