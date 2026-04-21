"use client"

import React, { useMemo, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tooltip,
  Typography,
} from "@mui/material"
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Link as LinkIcon,
  Visibility as VisibilityIcon,
  People as PeopleIcon,
} from "@mui/icons-material"
import DataHeader, { type ColumnOption, type FilterOption } from "../../components/reusable/DataHeader"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../components/reusable/CRUDModal"
import type { SupplyClient } from "./types"
import { format } from "date-fns"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
// (Date pickers not used on this form yet; kept intentionally simple.)
import { useSupply } from "../../../backend/context/SupplyContext"
import { useCompany } from "../../../backend/context/CompanyContext"
import SupplyClientCRUDForm, { type SupplyClientCRUDFormHandle } from "./SupplyClientCRUDForm"
import SupplyClientInviteDialog from "./SupplyClientInviteDialog"

type CrudMode = "create" | "edit" | "view"

const statusColor: Record<SupplyClient["status"], "success" | "warning" | "default"> = {
  active: "success",
  inactive: "warning",
  archived: "default",
}

const paymentTermsLabel: Record<NonNullable<SupplyClient["paymentTerms"]>, string> = {
  due_on_receipt: "Due on receipt",
  net_7: "Net 7",
  net_14: "Net 14",
  net_30: "Net 30",
  net_60: "Net 60",
}

const SupplyClients: React.FC = () => {
  const location = useLocation()
  const { state: supplyState, createClient, updateClient, deleteClient } = useSupply()
  const rows = supplyState.clients
  const error = supplyState.error
  const { state: companyState } = useCompany()

  const [search, setSearch] = useState("")
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<string>("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  const columns: ColumnOption[] = useMemo(
    () => [
      { key: "name", label: "Name" },
      { key: "type", label: "Type" },
      { key: "status", label: "Status" },
      { key: "contact", label: "Contact" },
      { key: "delivery", label: "Delivery" },
      { key: "terms", label: "Payment Terms" },
      { key: "updatedAt", label: "Updated" },
      { key: "actions", label: "Actions" },
    ],
    [],
  )

  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    columns.forEach((c) => (initial[c.key] = ["name", "type", "status", "contact", "delivery", "updatedAt", "actions"].includes(c.key)))
    return initial
  })

  const filterOptions = useMemo(
    () => [
      {
        label: "Type",
        options: [
          { id: "customer", name: "customer" },
          { id: "client", name: "client" },
        ] as FilterOption[],
        selectedValues: typeFilter,
        onSelectionChange: setTypeFilter,
      },
      {
        label: "Status",
        options: [
          { id: "active", name: "active" },
          { id: "inactive", name: "inactive" },
          { id: "archived", name: "archived" },
        ] as FilterOption[],
        selectedValues: statusFilter,
        onSelectionChange: setStatusFilter,
      },
    ],
    [typeFilter, statusFilter],
  )

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase()
    let r = rows.slice()
    if (q) {
      r = r.filter((c) => {
        const hay = [
          c.name,
          c.email,
          c.phone,
          c.website,
          c.contactName,
          c.city,
          c.postcode,
          c.country,
          c.deliveryContactName,
          c.deliveryContactEmail,
          c.deliveryContactPhone,
          c.deliveryCity,
          c.deliveryPostcode,
          c.deliveryCountry,
          ...(c.tags || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return hay.includes(q)
      })
    }
    if (typeFilter.length) r = r.filter((c) => typeFilter.includes(c.type))
    if (statusFilter.length) r = r.filter((c) => statusFilter.includes(c.status))

    const dir = sortDir === "asc" ? 1 : -1
    r.sort((a, b) => {
      if (sortBy === "updatedAt") {
        return ((a.updatedAt || a.createdAt) - (b.updatedAt || b.createdAt)) * dir
      }
      return (a.name || "").localeCompare(b.name || "") * dir
    })
    return r
  }, [rows, search, typeFilter, statusFilter, sortBy, sortDir])

  const paginated = useMemo(() => {
    const start = page * rowsPerPage
    return displayed.slice(start, start + rowsPerPage)
  }, [displayed, page, rowsPerPage])

  const exportCSV = () => {
    const escapeCSV = (val: unknown) => {
      const s = (val ?? "").toString()
      if (s.includes(",") || s.includes("\n") || s.includes('"')) return '"' + s.replace(/"/g, '""') + '"'
      return s
    }
    const headers = ["Name", "Type", "Status", "Email", "Phone", "City", "Postcode", "Country", "Payment Terms", "Updated"]
    const rowsOut = displayed.map((c) => [
      c.name,
      c.type,
      c.status,
      c.email || "",
      c.phone || "",
      c.city || "",
      c.postcode || "",
      c.country || "",
      c.paymentTerms ? paymentTermsLabel[c.paymentTerms] : "",
      format(new Date(c.updatedAt || c.createdAt), "yyyy-MM-dd HH:mm"),
    ])
    const csv = [headers.join(","), ...rowsOut.map((r) => r.map(escapeCSV).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `clients_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" })
    doc.setFontSize(16)
    doc.text("Clients Export", 14, 15)
    doc.setFontSize(10)
    doc.text(`Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}`, 14, 22)
    doc.text(`Total: ${displayed.length}`, 14, 28)
    autoTable(doc, {
      head: [["Name", "Type", "Status", "Email", "Phone", "City", "Payment Terms"]],
      body: displayed.map((c) => [
        c.name,
        c.type,
        c.status,
        c.email || "",
        c.phone || "",
        c.city || "",
        c.paymentTerms ? paymentTermsLabel[c.paymentTerms] : "",
      ]),
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [25, 118, 210], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    })
    doc.save(`clients_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`)
  }

  // CRUD modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [crudMode, setCrudMode] = useState<CrudMode>("create")
  const [active, setActive] = useState<SupplyClient | null>(null)
  const formRef = useRef<SupplyClientCRUDFormHandle | null>(null)

  // Invite dialog state
  const { generateClientInviteLink } = useSupply()
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteLink, setInviteLink] = useState("")

  const openCreate = () => {
    setActive(null)
    setCrudMode("create")
    setModalOpen(true)
  }

  const openView = (row: SupplyClient) => {
    setActive(row)
    setCrudMode("view")
    setModalOpen(true)
  }

  const openEdit = (row: SupplyClient) => {
    setActive(row)
    setCrudMode("edit")
    setModalOpen(true)
  }

  const handleDelete = async (row: SupplyClient) => {
    const ok = window.confirm(`Delete "${row.name}"? This cannot be undone.`)
    if (!ok) return
    try {
      await deleteClient(row.id)
    } catch (error: any) {
      window.alert(error?.message || "Failed to delete client.")
    }
  }

  const handleInviteClient = async () => {
    if (!active?.id) return
    const { link } = await generateClientInviteLink({
      clientId: active.id,
      email: active.email,
      phone: active.phone,
    })
    setInviteLink(link)
    setInviteDialogOpen(true)
  }

  const handleSave = async (data: Partial<SupplyClient>) => {
    const activeSnapshot = active
    const modeSnapshot = crudMode
    const now = Date.now()
    if (crudMode === "create") {
      const payload: Omit<SupplyClient, "id"> = {
        name: (data.name || "").trim(),
        type: (data.type as any) || "client",
        status: (data.status as any) || "active",
        accountReference: data.accountReference || "",
        vatNumber: data.vatNumber || "",
        email: data.email || "",
        phone: data.phone || "",
        website: data.website || "",
        contactName: data.contactName || "",

        addressLine1: data.addressLine1 || "",
        addressLine2: data.addressLine2 || "",
        city: data.city || "",
        county: data.county || "",
        postcode: data.postcode || "",
        country: data.country || "",

        billingAddressLine1: data.billingAddressLine1 || "",
        billingAddressLine2: data.billingAddressLine2 || "",
        billingCity: data.billingCity || "",
        billingCounty: data.billingCounty || "",
        billingPostcode: data.billingPostcode || "",
        billingCountry: data.billingCountry || "",

        deliveryContactName: data.deliveryContactName || "",
        deliveryContactEmail: data.deliveryContactEmail || "",
        deliveryContactPhone: data.deliveryContactPhone || "",

        deliveryAddressLine1: data.deliveryAddressLine1 || "",
        deliveryAddressLine2: data.deliveryAddressLine2 || "",
        deliveryCity: data.deliveryCity || "",
        deliveryCounty: data.deliveryCounty || "",
        deliveryPostcode: data.deliveryPostcode || "",
        deliveryCountry: data.deliveryCountry || "",

        receivingHours: data.receivingHours || "",
        preferredDeliveryDays: data.preferredDeliveryDays || [],
        preferredDeliveryTimeFrom: data.preferredDeliveryTimeFrom || "",
        preferredDeliveryTimeTo: data.preferredDeliveryTimeTo || "",
        requiresPONumber: Boolean(data.requiresPONumber),
        unloadingRequirements: data.unloadingRequirements || "",
        accessInstructions: data.accessInstructions || "",
        deliveryInstructions: data.deliveryInstructions || "",

        paymentTerms: data.paymentTerms as any,
        creditLimit: typeof data.creditLimit === "number" ? data.creditLimit : undefined,
        notes: data.notes || "",
        tags: data.tags || [],
        createdAt: now,
        updatedAt: now,
      }
      await createClient(payload)
    } else if (crudMode === "edit" && active) {
      await updateClient(active.id, { ...data, updatedAt: now } as any)
    }
    removeWorkspaceFormDraft(location.pathname, {
      crudEntity: "supplyClient",
      crudMode: modeSnapshot,
      id: activeSnapshot?.id,
      itemLabel: activeSnapshot?.name || undefined,
    })
    setModalOpen(false)
  }

  const title = useMemo(() => {
    if (crudMode === "create") return "Create Client"
    if (crudMode === "edit") return "Edit Client"
    return "View Client"
  }, [crudMode])

  const topBarActions = useMemo(() => {
    if (!active?.id || crudMode === "create") return undefined
    return (
      <Button
        variant="outlined"
        startIcon={<LinkIcon />}
        onClick={(e) => {
          e.stopPropagation()
          void handleInviteClient()
        }}
        size="small"
        sx={{ color: "inherit", borderColor: "rgba(255,255,255,0.5)" }}
      >
        Invite Client
      </Button>
    )
  }, [active?.id, crudMode, inviteLink])

  return (
    <Box>
      {error && (
        <Typography sx={{ mb: 2 }} color="error">
          {error}
        </Typography>
      )}

      <DataHeader
        title=""
        showDateControls={false}
        searchTerm={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, email, phone, delivery city, tags..."
        filters={filterOptions}
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded(!filtersExpanded)}
        columns={columns}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        sortOptions={[
          { value: "name", label: "Name" },
          { value: "updatedAt", label: "Updated" },
        ]}
        sortValue={sortBy}
        sortDirection={sortDir}
        onSortChange={(v, d) => {
          setSortBy(v)
          setSortDir(d)
        }}
        onExportCSV={exportCSV}
        onExportPDF={exportPDF}
        onCreateNew={openCreate}
        createButtonLabel="New Client"
      />

      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        {displayed.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <Typography color="text.secondary">
              No clients found. Create a new client to get started.
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: 640 }}>
              <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {columnVisibility.name && <TableCell>Name</TableCell>}
                  {columnVisibility.type && <TableCell>Type</TableCell>}
                  {columnVisibility.status && <TableCell>Status</TableCell>}
                  {columnVisibility.contact && <TableCell>Contact</TableCell>}
                  {columnVisibility.delivery && <TableCell>Delivery</TableCell>}
                  {columnVisibility.terms && <TableCell>Payment Terms</TableCell>}
                  {columnVisibility.updatedAt && <TableCell>Updated</TableCell>}
                  {columnVisibility.actions && <TableCell align="right">Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {paginated.map((c) => {
                  const updated = c.updatedAt || c.createdAt
                  return (
                    <TableRow key={c.id} hover onClick={() => openView(c)} sx={{ cursor: "pointer" }}>
                      {columnVisibility.name && <TableCell sx={{ fontWeight: 600 }}>{c.name}</TableCell>}
                      {columnVisibility.type && <TableCell>{c.type}</TableCell>}
                      {columnVisibility.status && (
                        <TableCell>
                          <Chip size="small" label={c.status} color={statusColor[c.status]} />
                        </TableCell>
                      )}
                      {columnVisibility.contact && (
                        <TableCell>
                          <Typography variant="body2">{c.contactName || "-"}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {(c.email || c.phone) ? `${c.email || ""}${c.email && c.phone ? " • " : ""}${c.phone || ""}` : "-"}
                          </Typography>
                        </TableCell>
                      )}
                      {columnVisibility.delivery && (
                        <TableCell>
                          <Typography variant="body2">{c.deliveryCity || c.city || "-"}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {c.deliveryPostcode || c.postcode || ""}
                          </Typography>
                        </TableCell>
                      )}
                      {columnVisibility.terms && (
                        <TableCell>{c.paymentTerms ? paymentTermsLabel[c.paymentTerms] : "-"}</TableCell>
                      )}
                      {columnVisibility.updatedAt && (
                        <TableCell>{format(new Date(updated), "dd MMM yyyy")}</TableCell>
                      )}
                      {columnVisibility.actions && (
                        <TableCell align="right">
                          <Tooltip title="View">
                            <IconButton size="small" onClick={() => openView(c)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation()
                                openEdit(c)
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation()
                                void handleDelete(c)
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              rowsPerPageOptions={[10, 25, 50, 100]}
              count={displayed.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_e, p) => setPage(p)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10))
                setPage(0)
              }}
            />
          </>
        )}
      </Paper>

      <CRUDModal
        open={modalOpen}
        onClose={(reason) => {
          setModalOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setActive(null)
            setCrudMode("create")
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "supplyClient",
          crudMode,
          id: active?.id,
          itemLabel: active?.name || undefined,
        }}
        title={title}
        icon={<PeopleIcon />}
        mode={crudMode}
        maxWidth="lg"
        onSave={async () => {}}
        onEdit={crudMode === "view" ? () => setCrudMode("edit") : undefined}
        formRef={formRef}
        topBarActions={topBarActions}
      >
        <SupplyClientCRUDForm
          ref={formRef}
          mode={crudMode}
          value={active}
          onChange={(next) => setActive(next)}
          onSubmit={handleSave}
        />
      </CRUDModal>

      {/* Invite Client Dialog */}
      <SupplyClientInviteDialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        inviteLink={inviteLink}
        companyName={companyState.companyName}
        client={{ contactName: active?.contactName, email: active?.email, phone: active?.phone }}
      />
    </Box>
  )
}

export default SupplyClients

