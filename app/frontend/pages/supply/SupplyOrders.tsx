"use client"

import React, { useMemo, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import {
  Box,
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material"
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  ShoppingCart as ShoppingCartIcon,
} from "@mui/icons-material"
import DataHeader, { type ColumnOption, type FilterOption } from "../../components/reusable/DataHeader"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../components/reusable/CRUDModal"
import type { SupplyOrder, SupplyOrderLine, SupplyOrderStatus } from "./types"
import { format } from "date-fns"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { useSupply } from "../../../backend/context/SupplyContext"
import SupplyOrderCRUDForm, { type SupplyOrderCRUDFormHandle, makeOrderNumber } from "./SupplyOrderCRUDForm"

type CrudMode = "create" | "edit" | "view"

const statusColor: Record<SupplyOrderStatus, "default" | "warning" | "info" | "success" | "error"> = {
  draft: "default",
  confirmed: "info",
  processing: "info",
  ready: "warning",
  dispatched: "warning",
  delivered: "success",
  cancelled: "error",
}

const SupplyOrders: React.FC = () => {
  const location = useLocation()
  const { state: supplyState, createOrder, updateOrder, deleteOrder } = useSupply()
  const rows = supplyState.orders
  const error = supplyState.error
  const clients = supplyState.clients

  const [search, setSearch] = useState("")
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [clientFilter, setClientFilter] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<string>("updatedAt")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  const columns: ColumnOption[] = useMemo(
    () => [
      { key: "orderNumber", label: "Order #" },
      { key: "client", label: "Client" },
      { key: "status", label: "Status" },
      { key: "dates", label: "Dates" },
      { key: "total", label: "Total" },
      { key: "updatedAt", label: "Updated" },
      { key: "actions", label: "Actions" },
    ],
    [],
  )

  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    columns.forEach((c) => (initial[c.key] = true))
    return initial
  })

  const statusOptions: FilterOption[] = useMemo(
    () =>
      (["draft", "confirmed", "processing", "ready", "dispatched", "delivered", "cancelled"] as SupplyOrderStatus[]).map((s) => ({
        id: s,
        name: s,
      })),
    [],
  )

  const clientOptions: FilterOption[] = useMemo(
    () =>
      clients
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({ id: c.id, name: c.name })),
    [clients],
  )

  const filters = useMemo(
    () => [
      {
        label: "Status",
        options: statusOptions,
        selectedValues: statusFilter,
        onSelectionChange: setStatusFilter,
      },
      {
        label: "Client",
        options: clientOptions,
        selectedValues: clientFilter,
        onSelectionChange: setClientFilter,
      },
    ],
    [statusOptions, statusFilter, clientOptions, clientFilter],
  )

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase()
    let r = rows.slice()
    if (q) {
      r = r.filter((o) => {
        const hay = [o.orderNumber, o.clientName, o.reference, o.notes]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return hay.includes(q)
      })
    }
    if (statusFilter.length) r = r.filter((o) => statusFilter.includes(o.status))
    if (clientFilter.length) r = r.filter((o) => clientFilter.includes(o.clientId))

    const dir = sortDir === "asc" ? 1 : -1
    r.sort((a, b) => {
      if (sortBy === "total") return (a.total - b.total) * dir
      return ((a.updatedAt || a.createdAt) - (b.updatedAt || b.createdAt)) * dir
    })
    return r
  }, [rows, search, statusFilter, clientFilter, sortBy, sortDir])

  const exportCSV = () => {
    const escapeCSV = (val: unknown) => {
      const s = (val ?? "").toString()
      if (s.includes(",") || s.includes("\n") || s.includes('"')) return '"' + s.replace(/"/g, '""') + '"'
      return s
    }
    const headers = ["Order #", "Client", "Status", "Order Date", "Requested Delivery", "Total", "Updated"]
    const rowsOut = displayed.map((o) => [
      o.orderNumber,
      o.clientName,
      o.status,
      format(new Date(o.orderDate), "yyyy-MM-dd"),
      o.requestedDeliveryDate ? format(new Date(o.requestedDeliveryDate), "yyyy-MM-dd") : "",
      o.total.toFixed(2),
      format(new Date(o.updatedAt || o.createdAt), "yyyy-MM-dd HH:mm"),
    ])
    const csv = [headers.join(","), ...rowsOut.map((r) => r.map(escapeCSV).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `orders_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" })
    doc.setFontSize(16)
    doc.text("Orders Export", 14, 15)
    doc.setFontSize(10)
    doc.text(`Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}`, 14, 22)
    doc.text(`Total: ${displayed.length}`, 14, 28)
    autoTable(doc, {
      head: [["Order #", "Client", "Status", "Order Date", "Req Delivery", "Total"]],
      body: displayed.map((o) => [
        o.orderNumber,
        o.clientName,
        o.status,
        format(new Date(o.orderDate), "dd MMM yyyy"),
        o.requestedDeliveryDate ? format(new Date(o.requestedDeliveryDate), "dd MMM yyyy") : "-",
        `£${o.total.toFixed(2)}`,
      ]),
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [25, 118, 210], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    })
    doc.save(`orders_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`)
  }

  const [modalOpen, setModalOpen] = useState(false)
  const [crudMode, setCrudMode] = useState<CrudMode>("create")
  const [active, setActive] = useState<SupplyOrder | null>(null)
  const formRef = useRef<SupplyOrderCRUDFormHandle | null>(null)

  const openCreate = () => {
    setActive(null)
    setCrudMode("create")
    setModalOpen(true)
  }
  const openView = (row: SupplyOrder) => {
    setActive(row)
    setCrudMode("view")
    setModalOpen(true)
  }
  const openEdit = (row: SupplyOrder) => {
    setActive(row)
    setCrudMode("edit")
    setModalOpen(true)
  }

  const handleDelete = async (row: SupplyOrder) => {
    const ok = window.confirm(`Delete order ${row.orderNumber}? This cannot be undone.`)
    if (!ok) return
    try {
      await deleteOrder(row.id)
    } catch (error: any) {
      window.alert(error?.message || "Failed to delete order.")
    }
  }

  const handleSave = async (data: Partial<SupplyOrder>) => {
    const activeSnapshot = active
    const modeSnapshot = crudMode
    const now = Date.now()
    if (crudMode === "create") {
      const clientId = data.clientId || ""
      const clientName = data.clientName || clients.find((c) => c.id === clientId)?.name || ""
      const lines = (data.lines || []) as SupplyOrderLine[]
      const subtotal = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0), 0)
      const tax = Number(data.tax) || 0
      const total = subtotal + tax
      const payload: Omit<SupplyOrder, "id"> = {
        orderNumber: data.orderNumber || makeOrderNumber(),
        clientId,
        clientName,
        status: (data.status as any) || "draft",
        orderDate: data.orderDate || now,
        requestedDeliveryDate: data.requestedDeliveryDate,
        currency: data.currency || "GBP",
        lines,
        subtotal,
        tax,
        total,
        reference: data.reference || "",
        notes: data.notes || "",
        createdAt: now,
        updatedAt: now,
      }
      await createOrder(payload)
    } else if (crudMode === "edit" && active) {
      const lines = (data.lines || []) as SupplyOrderLine[]
      const subtotal = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0), 0)
      const tax = Number(data.tax) || 0
      const total = subtotal + tax
      await updateOrder(active.id, { ...data, lines, subtotal, tax, total, updatedAt: now } as any)
    }
    removeWorkspaceFormDraft(location.pathname, {
      crudEntity: "supplyOrder",
      crudMode: modeSnapshot,
      id: activeSnapshot?.id,
      itemLabel: activeSnapshot?.orderNumber || undefined,
    })
    setModalOpen(false)
  }

  const title = useMemo(() => {
    if (crudMode === "create") return "Create Order"
    if (crudMode === "edit") return "Edit Order"
    return "View Order"
  }, [crudMode])

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
        searchPlaceholder="Search order number, client, reference..."
        filters={filters}
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded(!filtersExpanded)}
        columns={columns}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        sortOptions={[
          { value: "updatedAt", label: "Updated" },
          { value: "total", label: "Total" },
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
        createButtonLabel="New Order"
      />

      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        {displayed.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <Typography color="text.secondary">No orders found. Create a new order to get started.</Typography>
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 640 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {columnVisibility.orderNumber && <TableCell>Order #</TableCell>}
                  {columnVisibility.client && <TableCell>Client</TableCell>}
                  {columnVisibility.status && <TableCell>Status</TableCell>}
                  {columnVisibility.dates && <TableCell>Dates</TableCell>}
                  {columnVisibility.total && <TableCell>Total</TableCell>}
                  {columnVisibility.updatedAt && <TableCell>Updated</TableCell>}
                  {columnVisibility.actions && <TableCell align="right">Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {displayed.map((o) => (
                  <TableRow key={o.id} hover>
                    {columnVisibility.orderNumber && <TableCell sx={{ fontWeight: 600 }}>{o.orderNumber}</TableCell>}
                    {columnVisibility.client && <TableCell>{o.clientName}</TableCell>}
                    {columnVisibility.status && (
                      <TableCell>
                        <Chip size="small" label={o.status} color={statusColor[o.status]} />
                      </TableCell>
                    )}
                    {columnVisibility.dates && (
                      <TableCell>
                        <Typography variant="body2">Order: {format(new Date(o.orderDate), "dd MMM yyyy")}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Req: {o.requestedDeliveryDate ? format(new Date(o.requestedDeliveryDate), "dd MMM yyyy") : "-"}
                        </Typography>
                      </TableCell>
                    )}
                    {columnVisibility.total && <TableCell>£{o.total.toFixed(2)}</TableCell>}
                    {columnVisibility.updatedAt && (
                      <TableCell>{format(new Date(o.updatedAt || o.createdAt), "dd MMM yyyy")}</TableCell>
                    )}
                    {columnVisibility.actions && (
                      <TableCell align="right">
                        <Tooltip title="View">
                          <IconButton size="small" onClick={() => openView(o)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(o)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => handleDelete(o)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
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
          crudEntity: "supplyOrder",
          crudMode,
          id: active?.id,
          itemLabel: active?.orderNumber || undefined,
        }}
        title={title}
        icon={<ShoppingCartIcon />}
        mode={crudMode}
        maxWidth="xl"
        onSave={async () => {}}
        onEdit={crudMode === "view" ? () => setCrudMode("edit") : undefined}
        formRef={formRef}
      >
        <SupplyOrderCRUDForm
          ref={formRef}
          mode={crudMode}
          value={active}
          clients={clients}
          onChange={setActive}
          onSubmit={handleSave}
        />
      </CRUDModal>
    </Box>
  )
}

export default SupplyOrders

