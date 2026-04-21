/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useLocation } from "react-router-dom"
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material"
import {
  Delete as DeleteIcon,
  Description as ReportIcon,
  Edit as EditIcon,
} from "@mui/icons-material"
import { useCompany } from "../../../backend/context/CompanyContext"
import DataHeader from "../../components/reusable/DataHeader"
import CRUDModal, {
  type CRUDModalCloseReason,
  isCrudModalHardDismiss,
  removeWorkspaceFormDraft,
} from "../../components/reusable/CRUDModal"
import EmptyStateCard from "../../components/reusable/EmptyStateCard"

type ReportStatus = "draft" | "published"

const normalizeStatus = (raw: any): ReportStatus => (raw === "published" ? "published" : "draft")
const statusLabel = (s: ReportStatus): string => (s === "published" ? "Published" : "Draft")

type ReportSectionKey = "shift" | "finance" | "bookings" | "maintenance" | "stock"

const REPORT_SECTIONS: Array<{ key: ReportSectionKey; label: string }> = [
  { key: "shift", label: "Shift Report" },
  { key: "finance", label: "Finance Report" },
  { key: "bookings", label: "Bookings Report" },
  { key: "maintenance", label: "Maintenance Report" },
  { key: "stock", label: "Stock Report" },
]

const emptySections = (): Record<ReportSectionKey, string> => ({
  shift: "",
  finance: "",
  bookings: "",
  maintenance: "",
  stock: "",
})

const buildCombinedContent = (sections: Record<ReportSectionKey, string>): string => {
  const parts: string[] = []
  REPORT_SECTIONS.forEach(({ key, label }) => {
    const text = String(sections[key] || "").trim()
    if (!text) return
    parts.push(`${label}\n${text}`)
  })
  return parts.join("\n\n")
}

interface CompanyReport {
  id: string
  title: string
  content: string
  category?: string
  tags?: string[]
  status?: ReportStatus
  sections?: Partial<Record<ReportSectionKey, string>>
  shiftDate?: string // YYYY-MM-DD
  createdAt?: number
  createdBy?: string
  updatedAt?: number
  updatedBy?: string
}

interface ColumnConfig {
  id: string
  label: string
  minWidth?: number
  align?: "left" | "right" | "center"
}

const REPORT_COLUMNS: ColumnConfig[] = [
  { id: "title", label: "Title", minWidth: 240, align: "left" },
  { id: "status", label: "Status", minWidth: 120, align: "center" },
  { id: "updatedAt", label: "Last updated", minWidth: 200, align: "center" },
  { id: "actions", label: "Actions", minWidth: 140, align: "center" },
]

const generateId = () => `rep_${Date.now()}_${Math.random().toString(16).slice(2)}`

const Reports: React.FC = () => {
  const location = useLocation()
  const { state, hasPermission, getCompanyReports, saveCompanyReport, deleteCompanyReport, loadCompanySectionSettings } = useCompany()

  const canEdit = hasPermission("company", "reports", "edit")
  const canDelete = hasPermission("company", "reports", "delete")

  const [loading, setLoading] = useState(false)
  const [reports, setReports] = useState<CompanyReport[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"title" | "category" | "status" | "updatedAt">("updatedAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  const [notification, setNotification] = useState<{
    open: boolean
    message: string
    severity: "success" | "error" | "warning" | "info"
  }>({ open: false, message: "", severity: "info" })

  // Modal state (pattern matches HR Employee List)
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view">("view")
  const [modalDirty, setModalDirty] = useState(false)
  const [modalSaving, setModalSaving] = useState(false)
  const [activeSection, setActiveSection] = useState<ReportSectionKey>("shift")
  const [reportSectionVisibility, setReportSectionVisibility] = useState<Record<ReportSectionKey, boolean>>({
    shift: true,
    finance: true,
    bookings: true,
    maintenance: true,
    stock: true,
  })

  const [form, setForm] = useState<CompanyReport>({
    id: "",
    title: "",
    content: "",
    status: "draft",
    sections: emptySections(),
    shiftDate: "",
  })

  const refresh = useCallback(async () => {
    if (!state.companyID) {
      setReports([])
      return
    }

    setLoading(true)
    try {
      const list = (await getCompanyReports()) as CompanyReport[]
      setReports(Array.isArray(list) ? list : [])
    } catch (e: any) {
      setNotification({ open: true, severity: "error", message: e?.message || "Failed to load reports" })
    } finally {
      setLoading(false)
    }
  }, [getCompanyReports, state.companyID])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!state.companyID) return
      try {
        const v = (await loadCompanySectionSettings()) as any
        if (cancelled) return
        setReportSectionVisibility((prev) => ({
          ...prev,
          ...(v?.reportSectionVisibility || {}),
          // Shift report is always enabled
          shift: true,
        }))
      } catch {
        // non-blocking: if settings load fails, default to all visible
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [state.companyID, loadCompanySectionSettings])

  const enabledSections = useMemo(
    () => REPORT_SECTIONS.filter((s) => reportSectionVisibility[s.key] !== false),
    [reportSectionVisibility],
  )

  useEffect(() => {
    if (!enabledSections.length) return
    if (!enabledSections.some((s) => s.key === activeSection)) {
      setActiveSection(enabledSections[0].key)
    }
  }, [activeSection, enabledSections])

  useEffect(() => {
    setPage(0)
  }, [searchQuery, sortBy, sortOrder])

  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const base = !q
      ? reports
      : reports.filter((r) => {
          const title = String(r.title || "").toLowerCase()
          const content = String(r.content || "").toLowerCase()
          const status = String(r.status || "").toLowerCase()
          const shiftDate = String((r as any).shiftDate || "").toLowerCase()
          return title.includes(q) || content.includes(q) || status.includes(q) || shiftDate.includes(q)
        })

    const dir = sortOrder === "asc" ? 1 : -1
    const sorted = [...base].sort((a, b) => {
      switch (sortBy) {
        case "title":
          return String(a.title || "").localeCompare(String(b.title || "")) * dir
        case "category":
          return String(a.category || "").localeCompare(String(b.category || "")) * dir
        case "status":
          return String(a.status || "").localeCompare(String(b.status || "")) * dir
        case "updatedAt":
        default:
          return (Number(a.updatedAt || 0) - Number(b.updatedAt || 0)) * dir
      }
    })

    return sorted
  }, [reports, searchQuery, sortBy, sortOrder])

  const paginatedReports = useMemo(() => {
    const start = page * rowsPerPage
    return filteredReports.slice(start, start + rowsPerPage)
  }, [filteredReports, page, rowsPerPage])

  const openCreate = () => {
    if (!state.companyID) {
      setNotification({ open: true, severity: "info", message: "Select a company first." })
      return
    }
    if (!canEdit) {
      setNotification({ open: true, severity: "warning", message: "You don't have permission to create reports." })
      return
    }

    setModalMode("create")
    setModalDirty(false)
    setActiveSection(enabledSections[0]?.key || "shift")
    setForm({
      id: generateId(),
      title: "",
      content: "",
      status: "draft",
      sections: emptySections(),
      shiftDate: "",
    })
    setReportModalOpen(true)
  }

  const openView = (report: CompanyReport) => {
    setModalMode("view")
    setModalDirty(false)
    setActiveSection(enabledSections[0]?.key || "shift")
    const sections = {
      ...emptySections(),
      ...(report.sections || {}),
    } as Record<ReportSectionKey, string>
    // Backward-compat: if a legacy report has `content` but no sections, treat it as shift report.
    if (!Object.values(sections).some((v) => String(v || "").trim()) && report.content) {
      sections.shift = String(report.content || "")
    }
    setForm({
      id: String(report.id),
      title: String(report.title || ""),
      content: String(report.content || ""),
      status: normalizeStatus((report as any).status),
      sections,
      shiftDate: String((report as any).shiftDate || ""),
      createdAt: report.createdAt,
      createdBy: report.createdBy,
      updatedAt: report.updatedAt,
      updatedBy: report.updatedBy,
    })
    setReportModalOpen(true)
  }

  const openEdit = (report: CompanyReport) => {
    if (!canEdit) return openView(report)
    setModalMode("edit")
    setModalDirty(false)
    setActiveSection(enabledSections[0]?.key || "shift")
    const sections = {
      ...emptySections(),
      ...(report.sections || {}),
    } as Record<ReportSectionKey, string>
    if (!Object.values(sections).some((v) => String(v || "").trim()) && report.content) {
      sections.shift = String(report.content || "")
    }
    setForm({
      id: String(report.id),
      title: String(report.title || ""),
      content: String(report.content || ""),
      status: normalizeStatus((report as any).status),
      sections,
      shiftDate: String((report as any).shiftDate || ""),
      createdAt: report.createdAt,
      createdBy: report.createdBy,
      updatedAt: report.updatedAt,
      updatedBy: report.updatedBy,
    })
    setReportModalOpen(true)
  }

  const closeModal = (reason?: CRUDModalCloseReason) => {
    if ((modalMode === "create" || modalMode === "edit") && modalDirty) {
      const ok = window.confirm("You have unsaved changes. Discard them?")
      if (!ok) return
    }
    setReportModalOpen(false)
    if (isCrudModalHardDismiss(reason)) {
      setModalDirty(false)
      setModalMode("view")
    }
  }

  const saveFromModal = async () => {
    if (!state.companyID) {
      setNotification({ open: true, severity: "info", message: "Select a company first." })
      return
    }
    if (!canEdit) {
      setNotification({ open: true, severity: "warning", message: "You don't have permission to save reports." })
      return
    }

    const reportId = String(form.id || "").trim()
    const title = String(form.title || "").trim()
    if (!reportId) {
      setNotification({ open: true, severity: "error", message: "Missing report id." })
      return
    }
    if (!title) {
      setNotification({ open: true, severity: "warning", message: "Report title is required." })
      return
    }

    setModalSaving(true)
    const modeSnapshot = modalMode
    const idSnapshot = String(form.id || "").trim()
    const labelSnapshot = String(form.title || "").trim()
    try {
      const sections = {
        ...emptySections(),
        ...(form.sections || {}),
      } as Record<ReportSectionKey, string>
      const combinedContent = buildCombinedContent(sections)
      await saveCompanyReport(reportId, {
        ...form,
        id: reportId,
        title,
        // Remove legacy fields (we no longer use these in UI)
        category: "",
        tags: [],
        sections,
        // Keep a combined content field for search/export compatibility
        content: combinedContent,
        shiftDate: String((form as any).shiftDate || ""),
        status: normalizeStatus(form.status),
      })
      setNotification({ open: true, severity: "success", message: "Report saved" })
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "companyReport",
        crudMode: modeSnapshot,
        id: idSnapshot || undefined,
        itemLabel: labelSnapshot || undefined,
      })
      setModalDirty(false)
      setReportModalOpen(false)
      await refresh()
    } catch (e: any) {
      setNotification({ open: true, severity: "error", message: e?.message || "Failed to save report" })
    } finally {
      setModalSaving(false)
    }
  }

  const deleteReport = async (report: CompanyReport) => {
    if (!state.companyID) {
      setNotification({ open: true, severity: "info", message: "Select a company first." })
      return
    }
    if (!canDelete) {
      setNotification({ open: true, severity: "warning", message: "You don't have permission to delete reports." })
      return
    }
    const ok = window.confirm("Delete this report? This cannot be undone.")
    if (!ok) return

    setModalSaving(true)
    try {
      await deleteCompanyReport(String(report.id))
      setNotification({ open: true, severity: "success", message: "Report deleted" })
      if (reportModalOpen && String(form.id) === String(report.id)) {
        setReportModalOpen(false)
      }
      await refresh()
    } catch (e: any) {
      setNotification({ open: true, severity: "error", message: e?.message || "Failed to delete report" })
    } finally {
      setModalSaving(false)
    }
  }

  const onExportCSV = () => {
    try {
      const headers = ["Title", "Status", "Updated At"]
      const rows = filteredReports.map((r) => {
        const updated = r.updatedAt ? new Date(r.updatedAt).toLocaleString() : ""
        return [r.title || "", statusLabel(normalizeStatus((r as any).status)), updated]
      })
      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
      ].join("\n")
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `company_reports_${new Date().toISOString().split("T")[0]}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setNotification({ open: true, severity: "success", message: `Exported ${filteredReports.length} reports to CSV` })
    } catch (e: any) {
      setNotification({ open: true, severity: "error", message: e?.message || "Failed to export CSV" })
    }
  }

  return (
    <Box sx={{ p: 0 }}>
      <DataHeader
        title=""
        searchTerm={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search reports..."
        showDateControls={false}
        sortOptions={[
          { value: "updatedAt", label: "Last updated" },
          { value: "title", label: "Title" },
          { value: "status", label: "Status" },
        ]}
        sortValue={sortBy}
        sortDirection={sortOrder}
        onSortChange={(value, direction) => {
          setSortBy((value as any) || "updatedAt")
          setSortOrder(direction)
        }}
        onExportCSV={onExportCSV}
        onCreateNew={openCreate}
        createButtonLabel="Add Report"
        createDisabled={!canEdit || !state.companyID}
        createDisabledTooltip={!state.companyID ? "Select a company first." : "You don't have permission to create reports."}
      />

      <Paper sx={{ width: "100%", overflow: "hidden", display: "flex", flexDirection: "column", height: "calc(100vh - 300px)", minHeight: 400 }}>
        <TableContainer sx={{ flex: 1, overflow: "auto" }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {REPORT_COLUMNS.map((column) => {
                  const sortable = ["title", "status", "updatedAt"].includes(column.id)
                  return (
                    <TableCell
                      key={column.id}
                      align={column.align || "center"}
                      style={{ minWidth: column.minWidth }}
                      sx={{
                        padding: "16px 16px",
                        cursor: sortable ? "pointer" : "default",
                        userSelect: "none",
                        "&:hover": {
                          backgroundColor: sortable ? "rgba(0, 0, 0, 0.04)" : "transparent",
                        },
                      }}
                      onClick={() => {
                        if (!sortable) return
                        const nextSortBy = column.id as any
                        if (sortBy === nextSortBy) {
                          setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
                        } else {
                          setSortBy(nextSortBy)
                          setSortOrder("asc")
                        }
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: column.align === "left" ? "flex-start" : "center", gap: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                          {column.label}
                        </Typography>
                        {sortable && sortBy === column.id && (
                          <Box sx={{ display: "flex", alignItems: "center" }}>{sortOrder === "asc" ? "↑" : "↓"}</Box>
                        )}
                      </Box>
                    </TableCell>
                  )
                })}
              </TableRow>
            </TableHead>

            <TableBody>
              {!state.companyID ? (
                <TableRow>
                  <TableCell colSpan={REPORT_COLUMNS.length} align="center" sx={{ py: 4 }}>
                    <EmptyStateCard
                      icon={ReportIcon}
                      title="Select a company"
                      description="Choose a company to view and manage reports."
                      cardSx={{ maxWidth: 560, mx: "auto" }}
                    />
                  </TableCell>
                </TableRow>
              ) : loading ? (
                <TableRow>
                  <TableCell colSpan={REPORT_COLUMNS.length} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {paginatedReports.map((r) => {
                    const status = normalizeStatus((r as any).status)
                    const statusColors: Record<ReportStatus, "warning" | "success"> = {
                      draft: "warning",
                      published: "success",
                    }
                    const updatedLabel = r.updatedAt ? new Date(r.updatedAt).toLocaleString() : "—"
                    return (
                      <TableRow
                        hover
                        key={r.id}
                        onClick={() => openView(r)}
                        sx={{ cursor: "pointer", "& > td": { paddingTop: 1, paddingBottom: 1 } }}
                      >
                        <TableCell align="left" sx={{ verticalAlign: "middle" }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap title={r.title || ""}>
                            {r.title || "Untitled"}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ verticalAlign: "middle" }}>
                          <Chip
                            label={statusLabel(status)}
                            color={statusColors[status]}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center" sx={{ verticalAlign: "middle" }}>
                          <Typography variant="body2" noWrap title={updatedLabel}>
                            {updatedLabel}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ verticalAlign: "middle" }}>
                          <Box display="flex" gap={1} justifyContent="center" onClick={(e) => e.stopPropagation()}>
                            <IconButton size="small" onClick={() => openEdit(r)} disabled={!canEdit} title={canEdit ? "Edit" : "View"}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => void deleteReport(r)} disabled={!canDelete} title="Delete">
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )
                  })}

                  {paginatedReports.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={REPORT_COLUMNS.length} align="center" sx={{ py: 4 }}>
                        <EmptyStateCard
                          icon={ReportIcon}
                          title="No reports found"
                          description="Try adjusting your search or create a new report."
                          cardSx={{ maxWidth: 560, mx: "auto" }}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ flexShrink: 0, borderTop: 1, borderColor: "divider" }}>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={state.companyID ? filteredReports.length : 0}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_event, newPage) => setPage(newPage)}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10))
              setPage(0)
            }}
          />
        </Box>
      </Paper>

      <CRUDModal
        open={reportModalOpen}
        onClose={closeModal}
        workspaceFormShortcut={{
          crudEntity: "companyReport",
          crudMode: modalMode,
          id: form.id || undefined,
          itemLabel: form.title || undefined,
        }}
        title={modalMode === "create" ? "New Report" : modalMode === "edit" ? "Edit Report" : "View Report"}
        subtitle="Company reports are saved to the selected company."
        icon={<ReportIcon />}
        mode={modalMode}
        maxWidth={false}
        fullWidth
        dialogSx={{
          "& .MuiDialog-paper": {
            // Middle ground between full-width and breakpoint-based xl
            width: { xs: "calc(100vw - 32px)", md: "74vw" },
            maxWidth: 1350,
          },
        }}
        onEdit={canEdit ? () => setModalMode("edit") : undefined}
        onSave={saveFromModal}
        loading={modalSaving}
        saveButtonText="Save"
        editButtonText="Edit"
      >
        <Box component="fieldset" disabled={modalMode === "view" || modalSaving} sx={{ border: 0, p: 0, m: 0, minInlineSize: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, flexWrap: "wrap" }}>
            {modalDirty && (modalMode === "create" || modalMode === "edit") ? (
              <Chip size="small" label="Unsaved changes" color="warning" variant="outlined" />
            ) : null}
          </Box>

          <Box sx={{ display: "grid", gap: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Title"
                  value={form.title || ""}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, title: e.target.value }))
                    setModalDirty(true)
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    label="Status"
                    value={normalizeStatus(form.status)}
                    onChange={(e) => {
                      const next = normalizeStatus(e.target.value)
                      setForm((p) => ({ ...p, status: next }))
                      setModalDirty(true)
                    }}
                  >
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="published">Published</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Shift date"
                  type="date"
                  value={String((form as any).shiftDate || "")}
                  onChange={(e) => {
                    const value = e.target.value
                    setForm((p) => ({ ...p, shiftDate: value }))
                    setModalDirty(true)
                  }}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            {enabledSections.length === 0 ? (
              <Alert severity="info">
                All report sections are currently hidden. Enable them in Company → Settings → Reports defaults.
              </Alert>
            ) : (
              <>
                <Tabs
                  value={activeSection}
                  onChange={(_e, v) => setActiveSection(v as ReportSectionKey)}
                  variant="scrollable"
                  scrollButtons="auto"
                  aria-label="report sections"
                  sx={{
                    px: 0,
                    borderBottom: 1,
                    borderColor: "divider",
                    bgcolor: "transparent",
                    "& .MuiTab-root": { textTransform: "none", fontWeight: 700, minHeight: 44 },
                  }}
                >
                  {enabledSections.map((s) => (
                    <Tab key={s.key} value={s.key} label={s.label} />
                  ))}
                </Tabs>
                <TextField
                  fullWidth
                  label={enabledSections.find((s) => s.key === activeSection)?.label || "Report"}
                  value={String((form.sections as any)?.[activeSection] || "")}
                  onChange={(e) => {
                    const value = e.target.value
                    setForm((p) => ({
                      ...p,
                      sections: { ...(p.sections || {}), [activeSection]: value } as any,
                    }))
                    setModalDirty(true)
                  }}
                  placeholder="Write your report here…"
                  multiline
                  minRows={12}
                />
              </>
            )}

            {modalMode !== "create" && form.updatedAt ? (
              <Typography variant="caption" color="text.secondary">
                Last updated: {new Date(form.updatedAt).toLocaleString()}
              </Typography>
            ) : null}
          </Box>
        </Box>
      </CRUDModal>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ open: false, message: "", severity: "info" })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setNotification({ open: false, message: "", severity: "info" })}
          severity={notification.severity}
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default Reports

