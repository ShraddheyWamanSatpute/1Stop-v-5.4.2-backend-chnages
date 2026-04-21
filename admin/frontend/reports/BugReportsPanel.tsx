import React from "react"
import { alpha } from "@mui/material/styles"
import { Box, Chip, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material"
import { onValue } from "firebase/database"
import DataHeader from "../../../app/frontend/components/reusable/DataHeader"
import { db, ref } from "../../backend/services/Firebase"
import { themeConfig } from "../../../app/backend/context/AppTheme"
import {
  BUG_REPORTS_ADMIN_PATH,
  type BugReportRecord,
  type BugReportSeverity,
  type BugReportStatus,
} from "../../../app/backend/shared/BugReports"

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "critical":
      return "error"
    case "high":
      return "warning"
    case "medium":
      return "info"
    default:
      return "default"
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "resolved":
      return "success"
    case "reviewing":
      return "warning"
    default:
      return "default"
  }
}

const formatDateTime = (timestamp?: number) => {
  if (!timestamp) return "-"
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(timestamp))
  } catch {
    return String(timestamp)
  }
}

const STATUS_DISPLAY: Record<BugReportStatus, string> = {
  new: "New",
  reviewing: "Reviewing",
  resolved: "Resolved",
}

const STATUS_FROM_DISPLAY: Record<string, BugReportStatus> = {
  New: "new",
  Reviewing: "reviewing",
  Resolved: "resolved",
}

const SEVERITY_DISPLAY: Record<BugReportSeverity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
}

const SEVERITY_FROM_DISPLAY: Record<string, BugReportSeverity> = {
  Low: "low",
  Medium: "medium",
  High: "high",
  Critical: "critical",
}

/** PascalCase each token (split on spaces, underscores, hyphens, slashes). */
function toPascalCaseField(raw: string | undefined | null): string {
  const s = String(raw || "").trim()
  if (!s) return ""
  return s
    .split(/[\s_\-/]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("")
}

function displayStatus(status: string | undefined): string {
  if (!status) return ""
  const k = status.toLowerCase() as BugReportStatus
  if (k in STATUS_DISPLAY) return STATUS_DISPLAY[k]
  return toPascalCaseField(status) || status
}

function displaySeverity(severity: string | undefined): string {
  if (!severity) return ""
  const k = severity.toLowerCase() as BugReportSeverity
  if (k in SEVERITY_DISPLAY) return SEVERITY_DISPLAY[k]
  return toPascalCaseField(severity) || severity
}

type BugReportsPanelProps = {
  /** Use inside CRM/Ops tab scroll area (no nested section card). */
  embedded?: boolean
}

export default function BugReportsPanel({ embedded }: BugReportsPanelProps) {
  const [reports, setReports] = React.useState<BugReportRecord[]>([])
  const [searchTerm, setSearchTerm] = React.useState("")
  /** Empty = all statuses */
  const [statusSelections, setStatusSelections] = React.useState<BugReportStatus[]>([])
  /** Empty = all severities */
  const [severitySelections, setSeveritySelections] = React.useState<BugReportSeverity[]>([])
  const [filtersExpanded, setFiltersExpanded] = React.useState(false)

  React.useEffect(() => {
    let adminReportsValue: Record<string, any> = {}
    let companiesValue: Record<string, any> = {}

    const recompute = () => {
      const merged = new Map<string, BugReportRecord>()

      Object.entries(adminReportsValue || {}).forEach(([id, raw]: any) => {
        if (!id) return
        merged.set(id, { id, ...(raw || {}) } as BugReportRecord)
      })

      Object.entries(companiesValue || {}).forEach(([_companyId, companyRaw]: any) => {
        const reportMap = companyRaw?.bugReports || {}
        Object.entries(reportMap).forEach(([id, raw]: any) => {
          if (!id || merged.has(id)) return
          merged.set(id, { id, ...(raw || {}) } as BugReportRecord)
        })
      })

      const rows = Array.from(merged.values()).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
      setReports(rows)
    }

    const unsubscribeAdmin = onValue(ref(db, BUG_REPORTS_ADMIN_PATH), (snapshot) => {
      adminReportsValue = snapshot.val() || {}
      recompute()
    })

    const unsubscribeCompanies = onValue(ref(db, "companies"), (snapshot) => {
      companiesValue = snapshot.val() || {}
      recompute()
    })

    return () => {
      unsubscribeAdmin()
      unsubscribeCompanies()
    }
  }, [])

  const filteredReports = React.useMemo(() => {
    let next = [...reports]

    if (statusSelections.length > 0) {
      next = next.filter((report) => statusSelections.includes(report.status))
    }

    if (severitySelections.length > 0) {
      next = next.filter((report) => severitySelections.includes(report.severity))
    }

    if (searchTerm.trim()) {
      const query = searchTerm.trim().toLowerCase()
      next = next.filter((report) => {
        return (
          String(report.title || "").toLowerCase().includes(query) ||
          String(report.description || "").toLowerCase().includes(query) ||
          String(report.reportedByName || "").toLowerCase().includes(query) ||
          String(report.companyName || "").toLowerCase().includes(query) ||
          String(report.pagePath || "").toLowerCase().includes(query)
        )
      })
    }

    return next
  }, [reports, searchTerm, statusSelections, severitySelections])

  const dataHeader = (
    <DataHeader
      showDateControls={false}
      showDateTypeSelector={false}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Search title, description, reporter, company, page path…"
      filtersExpanded={filtersExpanded}
      onFiltersToggle={() => setFiltersExpanded((v) => !v)}
      filters={[
        {
          label: "Status",
          options: [
            { id: "new", name: "New" },
            { id: "reviewing", name: "Reviewing" },
            { id: "resolved", name: "Resolved" },
          ],
          selectedValues: statusSelections.map((s) => STATUS_DISPLAY[s]),
          onSelectionChange: (values) =>
            setStatusSelections(
              values.map((v) => STATUS_FROM_DISPLAY[v]).filter((v): v is BugReportStatus => Boolean(v)),
            ),
        },
        {
          label: "Severity",
          options: [
            { id: "low", name: "Low" },
            { id: "medium", name: "Medium" },
            { id: "high", name: "High" },
            { id: "critical", name: "Critical" },
          ],
          selectedValues: severitySelections.map((s) => SEVERITY_DISPLAY[s]),
          onSelectionChange: (values) =>
            setSeveritySelections(
              values.map((v) => SEVERITY_FROM_DISPLAY[v]).filter((v): v is BugReportSeverity => Boolean(v)),
            ),
        },
      ]}
    />
  )

  const body =
    filteredReports.length === 0 ? (
      <Box
        sx={{
          p: 3,
          textAlign: "center",
          color: "text.secondary",
        }}
      >
        <Typography variant="body1" fontWeight={600}>
          No bug reports found
        </Typography>
        <Typography variant="body2">New reports submitted from the app will appear here.</Typography>
      </Box>
    ) : (
      <TableContainer component={Paper} elevation={0}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Report</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Severity</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Submitted</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredReports.map((report) => (
              <TableRow key={report.id} hover>
                <TableCell sx={{ minWidth: 360 }}>
                  <Stack spacing={0.75}>
                    <Typography variant="body2" fontWeight={700}>
                      {report.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {report.area ? toPascalCaseField(report.area) : "General"}
                      {report.pagePath ? ` | ${report.pagePath}` : ""}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {report.description}
                    </Typography>
                    {report.stepsToReproduce ? (
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: 1.5,
                          bgcolor: alpha(themeConfig.brandColors.navy, 0.04),
                          border: "1px solid",
                          borderColor: alpha(themeConfig.brandColors.navy, 0.08),
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 700, display: "block", mb: 0.5 }}>
                          Steps
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {report.stepsToReproduce}
                        </Typography>
                      </Box>
                    ) : null}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip label={displaySeverity(report.severity)} size="small" color={getSeverityColor(report.severity) as any} />
                </TableCell>
                <TableCell>
                  <Chip
                    label={displayStatus(report.status)}
                    size="small"
                    color={getStatusColor(report.status) as any}
                    variant={report.status === "new" ? "outlined" : "filled"}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{report.companyName || "UnknownCompany"}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {[report.siteName, report.subsiteName].filter(Boolean).join(" / ") || "NoSiteSelected"}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{formatDateTime(report.createdAt)}</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    )

  if (embedded) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {dataHeader}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            px: { xs: 2, md: 2.5 },
            pb: 2,
            pt: 0,
          }}
        >
          {body}
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
      {dataHeader}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          px: { xs: 2, md: 2.5 },
          pb: 2,
          pt: 0,
        }}
      >
        {body}
      </Box>
    </Box>
  )
}
