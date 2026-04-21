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
  LocalShipping as LocalShippingIcon,
} from "@mui/icons-material"
import DataHeader, { type ColumnOption, type FilterOption } from "../../components/reusable/DataHeader"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../components/reusable/CRUDModal"
import type { SupplyDelivery, SupplyDeliveryStatus } from "./types"
import { format } from "date-fns"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { useSupply } from "../../../backend/context/SupplyContext"
import SupplyDeliveryCRUDForm, { type SupplyDeliveryCRUDFormHandle, makeDeliveryNumber } from "./SupplyDeliveryCRUDForm"

type CrudMode = "create" | "edit" | "view"

const statusColor: Record<SupplyDeliveryStatus, "default" | "info" | "success" | "error" | "warning"> = {
  scheduled: "info",
  in_transit: "warning",
  delivered: "success",
  failed: "error",
  cancelled: "default",
}

const SupplyDeliveries: React.FC = () => {
  const location = useLocation()
  const { state: supplyState, createDelivery, updateDelivery, deleteDelivery } = useSupply()
  const rows = supplyState.deliveries
  const error = supplyState.error
  const clients = supplyState.clients
  const orders = supplyState.orders

  const [search, setSearch] = useState("")
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<string>("updatedAt")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  const columns: ColumnOption[] = useMemo(
    () => [
      { key: "deliveryNumber", label: "Delivery #" },
      { key: "client", label: "Client" },
      { key: "status", label: "Status" },
      { key: "order", label: "Order" },
      { key: "schedule", label: "Schedule" },
      { key: "tracking", label: "Tracking" },
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
      (["scheduled", "in_transit", "delivered", "failed", "cancelled"] as SupplyDeliveryStatus[]).map((s) => ({
        id: s,
        name: s,
      })),
    [],
  )

  const filters = useMemo(
    () => [
      {
        label: "Status",
        options: statusOptions,
        selectedValues: statusFilter,
        onSelectionChange: setStatusFilter,
      },
    ],
    [statusOptions, statusFilter],
  )

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase()
    let r = rows.slice()
    if (q) {
      r = r.filter((d) => {
        const hay = [d.deliveryNumber, d.clientName, d.orderNumber, d.trackingRef, d.driverName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return hay.includes(q)
      })
    }
    if (statusFilter.length) r = r.filter((d) => statusFilter.includes(d.status))
    const dir = sortDir === "asc" ? 1 : -1
    r.sort((a, b) => ((a.updatedAt || a.createdAt) - (b.updatedAt || b.createdAt)) * dir)
    return r
  }, [rows, search, statusFilter, sortDir])

  const exportCSV = () => {
    const escapeCSV = (val: unknown) => {
      const s = (val ?? "").toString()
      if (s.includes(",") || s.includes("\n") || s.includes('"')) return '"' + s.replace(/"/g, '""') + '"'
      return s
    }
    const headers = ["Delivery #", "Client", "Status", "Order #", "Scheduled", "Driver", "Tracking", "Updated"]
    const rowsOut = displayed.map((d) => [
      d.deliveryNumber,
      d.clientName,
      d.status,
      d.orderNumber || "",
      d.scheduledDate ? format(new Date(d.scheduledDate), "yyyy-MM-dd") : "",
      d.driverName || "",
      d.trackingRef || "",
      format(new Date(d.updatedAt || d.createdAt), "yyyy-MM-dd HH:mm"),
    ])
    const csv = [headers.join(","), ...rowsOut.map((r) => r.map(escapeCSV).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `deliveries_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" })
    doc.setFontSize(16)
    doc.text("Deliveries Export", 14, 15)
    doc.setFontSize(10)
    doc.text(`Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}`, 14, 22)
    doc.text(`Total: ${displayed.length}`, 14, 28)
    autoTable(doc, {
      head: [["Delivery #", "Client", "Status", "Order #", "Scheduled", "Driver", "Tracking"]],
      body: displayed.map((d) => [
        d.deliveryNumber,
        d.clientName,
        d.status,
        d.orderNumber || "-",
        d.scheduledDate ? format(new Date(d.scheduledDate), "dd MMM yyyy") : "-",
        d.driverName || "-",
        d.trackingRef || "-",
      ]),
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [25, 118, 210], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    })
    doc.save(`deliveries_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`)
  }

  const [modalOpen, setModalOpen] = useState(false)
  const [crudMode, setCrudMode] = useState<CrudMode>("create")
  const [active, setActive] = useState<SupplyDelivery | null>(null)
  const formRef = useRef<SupplyDeliveryCRUDFormHandle | null>(null)

  const openCreate = () => {
    setActive(null)
    setCrudMode("create")
    setModalOpen(true)
  }
  const openView = (row: SupplyDelivery) => {
    setActive(row)
    setCrudMode("view")
    setModalOpen(true)
  }
  const openEdit = (row: SupplyDelivery) => {
    setActive(row)
    setCrudMode("edit")
    setModalOpen(true)
  }

  const handleDelete = async (row: SupplyDelivery) => {
    const ok = window.confirm(`Delete delivery ${row.deliveryNumber}? This cannot be undone.`)
    if (!ok) return
    try {
      await deleteDelivery(row.id)
    } catch (error: any) {
      window.alert(error?.message || "Failed to delete delivery.")
    }
  }

  const handleSave = async (data: Partial<SupplyDelivery>) => {
    const activeSnapshot = active
    const modeSnapshot = crudMode
    const now = Date.now()
    const selectedOrder = data.orderId ? orders.find((o) => o.id === data.orderId) : undefined
    if (data.orderId && !selectedOrder) {
      window.alert("The selected order no longer exists.")
      return
    }
    if (selectedOrder && selectedOrder.clientId !== data.clientId) {
      window.alert("Deliveries linked to an order must use the same client as that order.")
      return
    }
    if (crudMode === "create") {
      const clientId = selectedOrder?.clientId || data.clientId || ""
      const clientName = selectedOrder?.clientName || data.clientName || clients.find((c) => c.id === clientId)?.name || ""
      const orderId = data.orderId || ""
      const orderNumber = selectedOrder?.orderNumber || data.orderNumber || orders.find((o) => o.id === orderId)?.orderNumber || ""
      const payload: Omit<SupplyDelivery, "id"> = {
        deliveryNumber: data.deliveryNumber || makeDeliveryNumber(),
        orderId: orderId || undefined,
        orderNumber: orderNumber || undefined,
        clientId,
        clientName,
        status: (data.status as any) || "scheduled",
        scheduledDate: data.scheduledDate,
        dispatchedAt: data.dispatchedAt,
        deliveredAt: data.deliveredAt,
        driverName: data.driverName || "",
        trackingRef: data.trackingRef || "",
        deliveryAddress: data.deliveryAddress || "",
        proofOfDeliveryUrl: data.proofOfDeliveryUrl || "",
        notes: data.notes || "",
        createdAt: now,
        updatedAt: now,
      }
      try {
        await createDelivery(payload)
      } catch (error: any) {
        window.alert(error?.message || "Failed to save delivery.")
        return
      }
    } else if (crudMode === "edit" && active) {
      try {
        await updateDelivery(active.id, { ...data, updatedAt: now } as any)
      } catch (error: any) {
        window.alert(error?.message || "Failed to update delivery.")
        return
      }
    }
    removeWorkspaceFormDraft(location.pathname, {
      crudEntity: "supplyDelivery",
      crudMode: modeSnapshot,
      id: activeSnapshot?.id,
      itemLabel: activeSnapshot?.deliveryNumber || undefined,
    })
    setModalOpen(false)
  }

  const title = useMemo(() => {
    if (crudMode === "create") return "Create Delivery"
    if (crudMode === "edit") return "Edit Delivery"
    return "View Delivery"
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
        searchPlaceholder="Search delivery #, client, order #, tracking..."
        filters={filters}
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded(!filtersExpanded)}
        columns={columns}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        sortOptions={[{ value: "updatedAt", label: "Updated" }]}
        sortValue={sortBy}
        sortDirection={sortDir}
        onSortChange={(_, d) => setSortDir(d)}
        onExportCSV={exportCSV}
        onExportPDF={exportPDF}
        onCreateNew={openCreate}
        createButtonLabel="New Delivery"
      />

      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        {displayed.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <Typography color="text.secondary">No deliveries found. Create a new delivery to get started.</Typography>
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 640 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {columnVisibility.deliveryNumber && <TableCell>Delivery #</TableCell>}
                  {columnVisibility.client && <TableCell>Client</TableCell>}
                  {columnVisibility.status && <TableCell>Status</TableCell>}
                  {columnVisibility.order && <TableCell>Order</TableCell>}
                  {columnVisibility.schedule && <TableCell>Schedule</TableCell>}
                  {columnVisibility.tracking && <TableCell>Tracking</TableCell>}
                  {columnVisibility.updatedAt && <TableCell>Updated</TableCell>}
                  {columnVisibility.actions && <TableCell align="right">Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {displayed.map((d) => (
                  <TableRow key={d.id} hover>
                    {columnVisibility.deliveryNumber && <TableCell sx={{ fontWeight: 600 }}>{d.deliveryNumber}</TableCell>}
                    {columnVisibility.client && <TableCell>{d.clientName}</TableCell>}
                    {columnVisibility.status && (
                      <TableCell>
                        <Chip size="small" label={d.status} color={statusColor[d.status]} />
                      </TableCell>
                    )}
                    {columnVisibility.order && <TableCell>{d.orderNumber || "-"}</TableCell>}
                    {columnVisibility.schedule && (
                      <TableCell>
                        <Typography variant="body2">
                          {d.scheduledDate ? format(new Date(d.scheduledDate), "dd MMM yyyy") : "-"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Delivered: {d.deliveredAt ? format(new Date(d.deliveredAt), "dd MMM yyyy") : "-"}
                        </Typography>
                      </TableCell>
                    )}
                    {columnVisibility.tracking && (
                      <TableCell>
                        <Typography variant="body2">{d.trackingRef || "-"}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Driver: {d.driverName || "-"}
                        </Typography>
                      </TableCell>
                    )}
                    {columnVisibility.updatedAt && (
                      <TableCell>{format(new Date(d.updatedAt || d.createdAt), "dd MMM yyyy")}</TableCell>
                    )}
                    {columnVisibility.actions && (
                      <TableCell align="right">
                        <Tooltip title="View">
                          <IconButton size="small" onClick={() => openView(d)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(d)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => handleDelete(d)}>
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
          crudEntity: "supplyDelivery",
          crudMode,
          id: active?.id,
          itemLabel: active?.deliveryNumber || undefined,
        }}
        title={title}
        icon={<LocalShippingIcon />}
        mode={crudMode}
        maxWidth="lg"
        onSave={async () => {}}
        onEdit={crudMode === "view" ? () => setCrudMode("edit") : undefined}
        formRef={formRef}
      >
        <SupplyDeliveryCRUDForm
          ref={formRef}
          mode={crudMode}
          value={active}
          clients={clients}
          orders={orders}
          onChange={setActive}
          onSubmit={handleSave}
        />
      </CRUDModal>
    </Box>
  )
}

export default SupplyDeliveries

