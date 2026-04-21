"use client"

import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
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
  Typography,
} from "@mui/material"
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  SwapHoriz as SwapHorizIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material"
import { format, parseISO } from "date-fns"
import CRUDModal, {
  type CRUDModalCloseReason,
  isCrudModalHardDismiss,
  removeWorkspaceFormDraft,
} from "../reusable/CRUDModal"
import DataHeader from "../reusable/DataHeader"
import EmptyStateCard from "../reusable/EmptyStateCard"
import { usePermission } from "../../hooks/usePermission"
import { useStock } from "../../../backend/context/StockContext"
import { useCompany } from "../../../backend/context/CompanyContext"
import type { StockTransfer } from "../../../backend/interfaces/Stock"
import StockTransferForm, { StockTransferFormRef } from "./forms/StockTransferForm"
import { debugWarn } from "../../../backend/utils/debugLog"

const getStatusColor = (status: string) => {
  switch (status) {
    case "Approved":
      return "success"
    case "Awaiting Approval":
      return "warning"
    case "Awaiting Submission":
      return "info"
    default:
      return "default"
  }
}

const formatDateUK = (dateStr: string | undefined): string => {
  if (!dateStr) return ""
  const value = String(dateStr).trim()
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value
  try {
    const iso = parseISO(value)
    if (!Number.isNaN(iso.getTime())) return format(iso, "dd/MM/yyyy")
  } catch {
    // ignore
  }
  try {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return format(date, "dd/MM/yyyy")
  } catch {
    // ignore
  }
  return value
}

const StockTransfersTable: React.FC = () => {
  const location = useLocation()
  const {
    state,
    fetchAllStockTransfers: contextFetchAllStockTransfers,
    saveStockTransferPair: contextSaveStockTransferPair,
    deleteStockTransferPair: contextDeleteStockTransferPair,
  } = useStock()
  const { state: companyState } = useCompany()
  const { canEdit, canDelete } = usePermission()

  const canMutate = canEdit("stock", "counts")
  const canRemove = canDelete("stock", "counts")
  const { dataVersion } = state

  const [transfers, setTransfers] = useState<StockTransfer[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [destinationFilter, setDestinationFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState("dateUK")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit" | "view">("create")
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null)
  const formRef = useRef<StockTransferFormRef>(null)

  const locationLabel = useMemo(() => {
    const sites = Array.isArray(companyState.sites) ? companyState.sites : []
    const siteById = new Map<string, any>()
    for (const site of sites as any[]) {
      const id = String(site?.siteID || site?.id || "")
      if (id) siteById.set(id, site)
    }

    return (siteId?: string, subsiteId?: string) => {
      const sid = String(siteId || "").trim()
      const ssid = String(subsiteId || "").trim()
      if (!sid) return ""

      const site = siteById.get(sid)
      const siteName = String(site?.name || site?.siteName || sid)
      if (!ssid) return siteName

      const subsitesRecord = site?.subsites
      const subsite =
        subsitesRecord && typeof subsitesRecord === "object"
          ? (subsitesRecord[ssid] || subsitesRecord[String(ssid)] || null)
          : null
      const subsiteName = String(subsite?.name || subsite?.subsiteName || ssid)
      return `${siteName} / ${subsiteName}`
    }
  }, [companyState.sites])

  const hasLoadedRef = useRef(false)
  useEffect(() => {
    async function fetchData() {
      if (hasLoadedRef.current) return
      hasLoadedRef.current = true
      try {
        const all = await contextFetchAllStockTransfers()
        setTransfers(all || [])
      } catch (error) {
        debugWarn("Error fetching stock transfers:", error)
        hasLoadedRef.current = false
      }
    }
    fetchData()
    if (dataVersion) {
      hasLoadedRef.current = false
    }
  }, [contextFetchAllStockTransfers, dataVersion])

  const transfersWithDisplay = useMemo(() => {
    return (transfers || []).map((transfer) => {
      const destinationDisplayName =
        locationLabel(transfer.toSiteId, transfer.toSubsiteId) || String(transfer.toSiteId || "").trim()
      const sourceDisplayName =
        locationLabel(transfer.fromSiteId, transfer.fromSubsiteId) || String(transfer.fromSiteId || "").trim()
      const itemCount = Array.isArray(transfer.items) ? transfer.items.length : 0
      const totalQuantity = Array.isArray(transfer.items)
        ? transfer.items.reduce((sum, item) => sum + Number(item?.quantity || 0), 0)
        : 0
      const approvalCount = Number(Boolean(transfer.approvedBySource)) + Number(Boolean(transfer.approvedByDestination))

      return {
        ...transfer,
        destinationDisplayName,
        sourceDisplayName,
        itemCount,
        totalQuantity,
        approvalCount,
      }
    })
  }, [transfers, locationLabel])

  const uniqueStatuses = useMemo(() => {
    return [...new Set(transfersWithDisplay.map((transfer) => transfer.status).filter(Boolean))]
  }, [transfersWithDisplay])

  const uniqueDestinations = useMemo(() => {
    return [...new Set(transfersWithDisplay.map((transfer) => transfer.destinationDisplayName).filter(Boolean))].sort()
  }, [transfersWithDisplay])

  const filterOptions = useMemo(
    () => [
      {
        label: "Status",
        options: [{ id: "all", name: "All Statuses" }, ...uniqueStatuses.map((status) => ({ id: status || "", name: status || "" }))],
        selectedValues: statusFilter ? [statusFilter] : [],
        onSelectionChange: (values: string[]) => setStatusFilter(values[0] || "all"),
      },
      {
        label: "Destination",
        options: [{ id: "all", name: "All Destinations" }, ...uniqueDestinations.map((name) => ({ id: name, name }))],
        selectedValues: destinationFilter ? [destinationFilter] : [],
        onSelectionChange: (values: string[]) => setDestinationFilter(values[0] || "all"),
      },
    ],
    [destinationFilter, statusFilter, uniqueDestinations, uniqueStatuses],
  )

  const sortOptions = useMemo(
    () => [
      { value: "destinationDisplayName", label: "Destination" },
      { value: "status", label: "Status" },
      { value: "reference", label: "Reference" },
      { value: "dateUK", label: "Transfer Date" },
    ],
    [],
  )

  const filteredTransfers = useMemo(() => {
    let filtered = [...transfersWithDisplay]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((transfer) => {
        return (
          String(transfer.reference || "").toLowerCase().includes(query) ||
          String(transfer.status || "").toLowerCase().includes(query) ||
          String(transfer.destinationDisplayName || "").toLowerCase().includes(query) ||
          String(transfer.sourceDisplayName || "").toLowerCase().includes(query)
        )
      })
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((transfer) => transfer.status === statusFilter)
    }

    if (destinationFilter !== "all") {
      filtered = filtered.filter((transfer) => transfer.destinationDisplayName === destinationFilter)
    }

    return filtered.sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1
      const aValue = String((a as any)?.[sortBy] ?? "")
      const bValue = String((b as any)?.[sortBy] ?? "")
      return direction * aValue.localeCompare(bValue)
    })
  }, [destinationFilter, searchQuery, sortBy, sortDirection, statusFilter, transfersWithDisplay])

  const handleOpenForm = (transfer: StockTransfer | null = null, mode: "create" | "edit" | "view" = "create") => {
    if ((mode === "create" || mode === "edit") && !canMutate) return
    if (mode === "edit" && transfer) {
      if (transfer.transferType !== "sent") return
      if (String(transfer.status || "") !== "Awaiting Submission") return
    }

    setSelectedTransfer(transfer)
    setFormMode(mode)
    setFormOpen(true)
  }

  const resetTransferFormEntity = () => {
    setSelectedTransfer(null)
    setFormMode("create")
  }

  const handleModalClose = (reason?: CRUDModalCloseReason) => {
    setFormOpen(false)
    if (isCrudModalHardDismiss(reason)) {
      resetTransferFormEntity()
    }
  }

  const refreshList = async () => {
    const all = await contextFetchAllStockTransfers()
    setTransfers(all || [])
  }

  const handleSave = async (data: any) => {
    if (!canMutate) return
    try {
      if (data && typeof data === "object" && "nativeEvent" in data && "target" in data) {
        formRef.current?.submit?.()
        return
      }

      const modeSnapshot = formMode
      const transferSnapshot = selectedTransfer
      const saved = data as StockTransfer

      await contextSaveStockTransferPair(saved)
      await refreshList()
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "stockTransfer",
        crudMode: modeSnapshot,
        id: saved?.id || transferSnapshot?.id,
        itemLabel: saved?.reference || transferSnapshot?.reference || undefined,
      })
      setFormOpen(false)
      resetTransferFormEntity()
    } catch (error) {
      debugWarn("Error saving stock transfer:", error)
      alert(`Failed to save stock transfer: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const handleDelete = async (transfer: StockTransfer) => {
    if (!canRemove) return
    if (transfer.transferType !== "sent") return
    if (transfer.status === "Approved") {
      alert("Cannot delete approved stock transfers")
      return
    }
    if (!window.confirm("Are you sure you want to delete this stock transfer?")) return

    try {
      await contextDeleteStockTransferPair(transfer)
      await refreshList()
    } catch (error) {
      debugWarn("Error deleting stock transfer:", error)
      alert("Failed to delete stock transfer")
    }
  }

  const handleSubmit = async (transfer: StockTransfer) => {
    if (!canMutate) return
    if (transfer.transferType !== "sent") return
    if (String(transfer.status || "") !== "Awaiting Submission") return

    try {
      await contextSaveStockTransferPair({
        ...(transfer as any),
        status: "Awaiting Approval",
        approvedBySource: false,
        approvedByDestination: false,
        sourceApprovedAt: undefined,
        destinationApprovedAt: undefined,
      })
      await refreshList()
    } catch (error) {
      debugWarn("Error submitting stock transfer:", error)
      alert("Failed to submit stock transfer")
    }
  }

  const handleApprove = async (transfer: StockTransfer) => {
    if (!canMutate) return
    if (String(transfer.status || "") !== "Awaiting Approval") return

    try {
      const approvalPatch =
        transfer.transferType === "sent"
          ? { approvedBySource: true, sourceApprovedAt: new Date().toISOString() }
          : { approvedByDestination: true, destinationApprovedAt: new Date().toISOString() }

      await contextSaveStockTransferPair({ ...(transfer as any), status: "Awaiting Approval", ...approvalPatch })
      await refreshList()
    } catch (error) {
      debugWarn("Error approving stock transfer:", error)
      alert("Failed to approve stock transfer")
    }
  }

  const hasActiveFilters = searchQuery.length > 0 || statusFilter !== "all" || destinationFilter !== "all"

  return (
    <Box sx={{ px: 0 }}>
      <DataHeader
        showDateControls={false}
        searchTerm={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search transfers..."
        filters={filterOptions as any}
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded((previous) => !previous)}
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={(field, direction) => {
          setSortBy(field)
          setSortDirection(direction)
        }}
        onCreateNew={() => handleOpenForm(null, "create")}
        createButtonLabel="New Transfer"
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit stock transfers."
      />

      {filteredTransfers.length === 0 ? (
        <Box sx={{ py: 4 }}>
          <EmptyStateCard
            icon={SwapHorizIcon}
            title={hasActiveFilters ? "No transfers match your filters" : "No transfers found"}
            description={hasActiveFilters ? "Try adjusting your filters or search query" : "Create your first transfer to get started."}
          />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold" }}>Destination</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Reference</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Items</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Total Qty</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Transfer Date</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTransfers.map((transfer: any) => (
                <TableRow
                  key={transfer.id}
                  hover
                  onClick={() => handleOpenForm(transfer, "view")}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {transfer.destinationDisplayName || "Unknown destination"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      From {transfer.sourceDisplayName || "Unknown source"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={
                        transfer.status === "Awaiting Approval"
                          ? `Awaiting Approval (${transfer.approvalCount}/2)`
                          : transfer.status
                      }
                      color={getStatusColor(transfer.status) as any}
                      size="small"
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                      {transfer.transferType === "received" ? "Received side" : "Sending side"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{transfer.reference || "-"}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {transfer.description || "No description"}
                    </Typography>
                  </TableCell>
                  <TableCell>{transfer.itemCount}</TableCell>
                  <TableCell>{transfer.totalQuantity}</TableCell>
                  <TableCell>{formatDateUK(transfer.dateUK || transfer.date)}</TableCell>
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <Box display="flex" gap={1}>
                      {transfer.transferType === "sent" && String(transfer.status || "") === "Awaiting Submission" && (
                        <>
                          <IconButton
                            size="small"
                            color="primary"
                            disabled={!canMutate}
                            onClick={() => handleOpenForm(transfer, "edit")}
                            title={canMutate ? "Edit" : "No permission to edit"}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="primary"
                            disabled={!canMutate}
                            onClick={() => handleSubmit(transfer)}
                            title={canMutate ? "Submit" : "No permission to submit"}
                          >
                            <SendIcon />
                          </IconButton>
                        </>
                      )}
                      {String(transfer.status || "") === "Awaiting Approval" &&
                        ((transfer.transferType === "sent" && !transfer.approvedBySource) ||
                          (transfer.transferType === "received" && !transfer.approvedByDestination)) && (
                          <IconButton
                            size="small"
                            color="success"
                            disabled={!canMutate}
                            onClick={() => handleApprove(transfer)}
                            title={canMutate ? "Approve" : "No permission to approve"}
                          >
                            <CheckCircleIcon />
                          </IconButton>
                        )}
                      {transfer.transferType === "sent" && transfer.status !== "Approved" && (
                        <IconButton
                          size="small"
                          color="error"
                          disabled={!canRemove}
                          onClick={() => handleDelete(transfer)}
                          title={canRemove ? "Delete" : "No permission to delete"}
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <CRUDModal
        open={formOpen}
        onClose={handleModalClose}
        workspaceFormShortcut={{
          crudEntity: "stockTransfer",
          crudMode: formMode,
          id: selectedTransfer?.id,
          itemLabel: selectedTransfer?.reference || undefined,
        }}
        title={formMode === "create" ? "Create Transfer" : formMode === "edit" ? "Edit Transfer" : "View Transfer"}
        mode={formMode}
        onSave={handleSave}
        formRef={formRef}
        maxWidth={false}
        saveButtonText="Save"
        hideCloseAction={true}
        onEdit={
          formMode === "view" &&
          selectedTransfer &&
          selectedTransfer.transferType === "sent" &&
          String(selectedTransfer.status || "") === "Awaiting Submission"
            ? () => setFormMode("edit")
            : undefined
        }
      >
        <StockTransferForm ref={formRef} stockTransfer={selectedTransfer} mode={formMode} onSave={handleSave} />
      </CRUDModal>
    </Box>
  )
}

export default StockTransfersTable
