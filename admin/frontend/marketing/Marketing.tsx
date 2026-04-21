"use client"
import { useLocation } from "react-router-dom"

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
import { Delete as DeleteIcon, Edit as EditIcon, Campaign as CampaignIcon } from "@mui/icons-material"
import DataHeader from "../../../app/frontend/components/reusable/DataHeader"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../../app/frontend/components/reusable/CRUDModal"
import EmptyStateCard from "../../../app/frontend/components/reusable/EmptyStateCard"
import { useAdmin } from "../../backend/context/AdminContext"
import type { MarketingEvent } from "../../backend/interfaces/Marketing"
import MarketingEventCRUDForm, { type MarketingEventCRUDFormHandle } from "./forms/MarketingEventCRUDForm"

type ColumnConfig = {
  id: string
  label: string
  minWidth?: number
  align?: "left" | "right" | "center"
}

const MarketingPage = () => {
  const location = useLocation()
  const { marketingEvents, fetchMarketingEvents, createMarketingEvent, updateMarketingEvent, deleteMarketingEvent } = useAdmin()

  const [search, setSearch] = useState("")
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [statusFilter, setStatusFilter] = useState<Array<MarketingEvent["status"]>>([])
  const [typeFilter, setTypeFilter] = useState<Array<MarketingEvent["type"]>>([])
  const [sortValue, setSortValue] = useState<"updatedAt" | "startDate" | "name">("startDate")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  // CRUD modal
  const [crudOpen, setCrudOpen] = useState(false)
  const [crudMode, setCrudMode] = useState<"create" | "edit" | "view">("create")
  const [selected, setSelected] = useState<MarketingEvent | null>(null)
  const formRef = useRef<MarketingEventCRUDFormHandle | null>(null)

  // Delete confirm
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [toDelete, setToDelete] = useState<MarketingEvent | null>(null)

  useEffect(() => {
    fetchMarketingEvents()
  }, [fetchMarketingEvents])

  const columns: ColumnConfig[] = useMemo(
    () => [
      { id: "name", label: "Name", minWidth: 240 },
      { id: "type", label: "Type", minWidth: 160 },
      { id: "status", label: "Status", minWidth: 140, align: "center" },
      { id: "budget", label: "Budget", minWidth: 120, align: "right" },
      { id: "spent", label: "Spent", minWidth: 120, align: "right" },
      { id: "startDate", label: "Start", minWidth: 140 },
      { id: "endDate", label: "End", minWidth: 140 },
      { id: "actions", label: "Actions", minWidth: 120, align: "center" },
    ],
    [],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = (marketingEvents || []).filter((e) => {
      if (statusFilter.length > 0 && !statusFilter.includes(e.status)) return false
      if (typeFilter.length > 0 && !typeFilter.includes(e.type)) return false
      if (!q) return true
      return (
        String(e.name || "").toLowerCase().includes(q) ||
        String(e.description || "").toLowerCase().includes(q) ||
        String(e.type || "").toLowerCase().includes(q) ||
        String(e.status || "").toLowerCase().includes(q)
      )
    })

    const dir = sortDirection === "asc" ? 1 : -1
    return [...base].sort((a, b) => {
      if (sortValue === "name") return String(a.name || "").localeCompare(String(b.name || "")) * dir
      if (sortValue === "updatedAt") return (Number(a.timestamp || 0) - Number(b.timestamp || 0)) * dir
      return (Number(a.startDate || 0) - Number(b.startDate || 0)) * dir
    })
  }, [marketingEvents, search, sortDirection, sortValue, statusFilter, typeFilter])

  const paginated = useMemo(() => {
    const startIndex = page * rowsPerPage
    return filtered.slice(startIndex, startIndex + rowsPerPage)
  }, [filtered, page, rowsPerPage])

  const openCreate = useCallback(() => {
    setSelected(null)
    setCrudMode("create")
    setCrudOpen(true)
  }, [])

  const openView = useCallback((e: MarketingEvent) => {
    setSelected(e)
    setCrudMode("view")
    setCrudOpen(true)
  }, [])

  const openEdit = useCallback((e: MarketingEvent) => {
    setSelected(e)
    setCrudMode("edit")
    setCrudOpen(true)
  }, [])

  const closeCrud = useCallback(() => {
    setCrudOpen(false)
    setSelected(null)
    setCrudMode("create")
  }, [])

  const save = useCallback(
    async (payload: {
      name: string
      description: string
      type: MarketingEvent["type"]
      status: MarketingEvent["status"]
      startDate: number
      endDate: number
      budget: number
      spent: number
      targetAudience: string
      adContent: string
    }) => {
      const modeSnapshot = crudMode
      const selectedSnapshot = selected
      if (selected?.id && crudMode === "edit") {
        await updateMarketingEvent(selected.id, payload as any)
        removeWorkspaceFormDraft(location.pathname, {
          crudEntity: "marketingModal1",
          crudMode: modeSnapshot,
          id: selectedSnapshot?.id,
          itemLabel: selectedSnapshot?.name || payload.name,
        })
        closeCrud()
        return
      }

      await createMarketingEvent({
        ...payload,
      } as any)
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "marketingModal1",
        crudMode: modeSnapshot,
        id: undefined,
        itemLabel: payload.name,
      })
      closeCrud()
    },
    [closeCrud, createMarketingEvent, crudMode, location.pathname, selected, updateMarketingEvent],
  )

  const askDelete = useCallback((e: MarketingEvent) => {
    setToDelete(e)
    setDeleteConfirmOpen(true)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!toDelete?.id) return
    await deleteMarketingEvent(toDelete.id)
    setDeleteConfirmOpen(false)
    setToDelete(null)
  }, [deleteMarketingEvent, toDelete])

  const statusChipColor = (s: MarketingEvent["status"]) => {
    if (s === "active") return "success"
    if (s === "planned") return "info"
    if (s === "paused") return "warning"
    if (s === "completed") return "default"
    return "default"
  }

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
        searchPlaceholder="Search campaigns…"
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded((p) => !p)}
        filters={[
          {
            label: "Status",
            options: ["planned", "active", "paused", "completed"].map((v) => ({ id: v, name: v })),
            selectedValues: statusFilter as any,
            onSelectionChange: (values) => {
              setStatusFilter(values as any)
              setPage(0)
            },
          },
          {
            label: "Type",
            options: ["google_ads", "instagram_ads", "facebook_ads", "email_campaign", "content_post", "event"].map((v) => ({
              id: v,
              name: v,
            })),
            selectedValues: typeFilter as any,
            onSelectionChange: (values) => {
              setTypeFilter(values as any)
              setPage(0)
            },
          },
        ]}
        sortOptions={[
          { value: "startDate", label: "Start date" },
          { value: "updatedAt", label: "Last updated" },
          { value: "name", label: "Name" },
        ]}
        sortValue={sortValue}
        sortDirection={sortDirection}
        onSortChange={(value, direction) => {
          setSortValue(value as any)
          setSortDirection(direction)
          setPage(0)
        }}
        onCreateNew={openCreate}
        createButtonLabel="Add Campaign"
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
                {columns.map((c) => (
                  <TableCell key={c.id} align={(c.align as any) || "left"} sx={{ minWidth: c.minWidth }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      {c.label}
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.map((e) => (
                <TableRow key={e.id || e.name} hover sx={{ cursor: "pointer" }} onClick={() => openView(e)}>
                  <TableCell>
                    <Typography fontWeight={800}>{e.name || "—"}</Typography>
                    {e.description ? (
                      <Typography variant="caption" color="text.secondary">
                        {e.description}
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell sx={{ textTransform: "capitalize" }}>{String(e.type || "").replace("_", " ")}</TableCell>
                  <TableCell align="center">
                    <Chip size="small" label={e.status} color={statusChipColor(e.status) as any} sx={{ textTransform: "capitalize" }} />
                  </TableCell>
                  <TableCell align="right">{Number(e.budget || 0).toLocaleString()}</TableCell>
                  <TableCell align="right">{Number(e.spent || 0).toLocaleString()}</TableCell>
                  <TableCell>{e.startDate ? new Date(e.startDate).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>{e.endDate ? new Date(e.endDate).toLocaleDateString() : "—"}</TableCell>
                  <TableCell align="center" onClick={(ev) => ev.stopPropagation()}>
                    <Box sx={{ display: "inline-flex", gap: 0.5 }}>
                      <IconButton size="small" title="Edit" onClick={() => openEdit(e)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" title="Delete" onClick={() => askDelete(e)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}

              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                    <EmptyStateCard
                      icon={CampaignIcon}
                      title="No campaigns found"
                      description="Create your first campaign, or adjust your search/filters."
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
        onClose={(reason) => {
          setCrudOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            closeCrud()
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "marketingModal1",
          crudMode: crudMode,
          id: selected?.id,
          itemLabel: selected?.name || undefined,
        }}
        title={
          crudMode === "create" ? "Create campaign" : crudMode === "edit" ? "Edit campaign" : "View campaign"
        }
        subtitle={selected?.id ? `Campaign: ${selected.id}` : undefined}
        icon={<CampaignIcon />}
        mode={crudMode}
        onEdit={crudMode === "view" && selected ? () => setCrudMode("edit") : undefined}
        onSave={crudMode === "view" ? undefined : save}
        formRef={formRef as any}
      >
        <MarketingEventCRUDForm ref={formRef} event={selected} mode={crudMode} onSave={save} />
      </CRUDModal>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm delete</DialogTitle>
        <DialogContent>
          <Typography>
            Delete campaign <strong>{toDelete?.name || "—"}</strong>? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Close</Button>
          <Button variant="contained" color="error" onClick={confirmDelete} disabled={!toDelete?.id}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default MarketingPage
