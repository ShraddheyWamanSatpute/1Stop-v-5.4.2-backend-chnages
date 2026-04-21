"use client"

import React, { useState, useMemo } from "react"
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
} from "@mui/material"
import { useHRReportContext } from "../../../../backend/context/AnalyticsContext"
import DataHeader from "../../reusable/DataHeader"
import { format, differenceInDays, addDays, subDays, startOfDay, endOfDay } from "date-fns"
import { 
  filterByCompanyContext, 
  safeArray,
  safeString,
  safeParseDate 
} from "../../../utils/reportHelpers"
import { exportReportContainerToCsv, exportReportContainerToPdf } from "../../../utils/reportExport"
import type { HRReportProps } from "./reportTypes"
import EmptyStateCard from "../../reusable/EmptyStateCard"
import { Article as ArticleIcon } from "@mui/icons-material"

type GroupByType = "none" | "documentType" | "location" | "status"

const EmployeeDocumentationTrackerReport: React.FC<HRReportProps> = ({ headerControls }) => {
  const { hrState, companyState } = useHRReportContext()
  const { employees = [], complianceTasks = [] } = hrState
  const { sites = [] } = companyState

  const [dateType] = useState<"custom">("custom")
  const [customStartDate, setCustomStartDate] = useState<Date>(subDays(new Date(), 30))
  const [customEndDate, setCustomEndDate] = useState<Date>(addDays(new Date(), 90))
  const [groupBy, setGroupBy] = useState<GroupByType>("none")
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedDocumentTypes, setSelectedDocumentTypes] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])

  const documents = useMemo(() => {
    try {
      const rangeStart = startOfDay(customStartDate)
      const rangeEnd = endOfDay(customEndDate)
      // Filter employees by company context first
      const contextFilteredEmployees = filterByCompanyContext(
        safeArray(employees),
        companyState.selectedSiteID,
        companyState.selectedSubsiteID
      )
      const employeeIds = new Set(contextFilteredEmployees.map((e: any) => e.id))
      
      const today = new Date()
      const docs: any[] = []
      
      // Collect documents from compliance tasks
      safeArray(complianceTasks).forEach((task: any) => {
        if (!employeeIds.has(task.employeeId)) return
        
        const employee = contextFilteredEmployees.find((e: any) => e.id === task.employeeId)
        if (!employee) return
        
        const expiryDate = safeParseDate(task.dueDate || task.expiryDate)
        const issueDate = safeParseDate(task.createdAt || task.issueDate)
        
        let daysUntilExpiry = 0
        let status = "Unknown"
        
        if (expiryDate) {
          daysUntilExpiry = differenceInDays(expiryDate, today)
          
          if (daysUntilExpiry < 0) {
            status = "Overdue"
          } else if (daysUntilExpiry <= 7) {
            status = "Critical"
          } else if (daysUntilExpiry <= 30) {
            status = "Expiring Soon"
          } else if (safeString(task.status) === "completed" || task.isCompleted) {
            status = "Compliant"
          } else {
            status = "Active"
          }
        } else if (safeString(task.status) === "completed" || task.isCompleted) {
          status = "Compliant"
        } else {
          status = "Pending"
        }
        
        docs.push({
          id: task.id,
          employeeId: employee.id,
          employeeName: `${safeString(employee.firstName)} ${safeString(employee.lastName)}`,
          departmentId: safeString(employee.departmentId),
        siteId: employee.siteId,
        documentType: task.title || task.type || "Compliance Document",
        issueDate,
        expiryDate,
        uploadedBy: task.assignedBy || "-",
        status,
        daysUntilExpiry,
      })
    })
    
      // Also check for documents stored directly on employees
      contextFilteredEmployees.forEach((emp: any) => {
        const employeeDocs = safeArray(emp.documents)
        employeeDocs.forEach((doc: any) => {
          const expiryDate = safeParseDate(doc.expiryDate)
          const issueDate = safeParseDate(doc.uploadDate || doc.issueDate)
          
          let daysUntilExpiry = 0
          let status = "Compliant"
          
          if (expiryDate) {
            daysUntilExpiry = differenceInDays(expiryDate, today)
            
            if (daysUntilExpiry < 0) {
              status = "Overdue"
            } else if (daysUntilExpiry <= 7) {
              status = "Critical"
            } else if (daysUntilExpiry <= 30) {
              status = "Expiring Soon"
            }
          }
          
          docs.push({
            id: doc.id || `${emp.id}-${doc.type}`,
            employeeId: emp.id,
            employeeName: `${safeString(emp.firstName)} ${safeString(emp.lastName)}`,
            departmentId: safeString(emp.departmentId),
            siteId: safeString(emp.siteId),
            documentType: safeString(doc.type || doc.name, "Document"),
            issueDate,
            expiryDate,
            uploadedBy: safeString(doc.uploadedBy, "-"),
            status,
            daysUntilExpiry,
          })
        })
      })
      
      return docs
        .filter((doc: any) => {
          if (!doc.expiryDate) return false
          return doc.expiryDate >= rangeStart && doc.expiryDate <= rangeEnd
        })
        .filter((doc: any) => {
          const matchesLocation = selectedLocations.length === 0 || selectedLocations.includes(safeString(doc.siteId))
          const matchesDocType = selectedDocumentTypes.length === 0 || selectedDocumentTypes.includes(safeString(doc.documentType))
          const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(safeString(doc.status))
          return matchesLocation && matchesDocType && matchesStatus
        })
        .sort((a: any, b: any) => {
          if (!a.expiryDate) return 1
          if (!b.expiryDate) return -1
          return a.daysUntilExpiry - b.daysUntilExpiry
        })
    } catch (error) {
      console.error("Error calculating documents:", error)
      return []
    }
  }, [
    employees,
    complianceTasks,
    selectedLocations,
    selectedDocumentTypes,
    selectedStatuses,
    companyState.selectedSiteID,
    companyState.selectedSubsiteID,
    customStartDate,
    customEndDate,
  ])

  const metrics = useMemo(() => {
    const totalDocuments = documents.length
    const overdue = documents.filter((d: any) => d.status === "Overdue").length
    const expiringSoon = documents.filter((d: any) => d.status === "Expiring Soon" || d.status === "Critical").length
    const compliant = documents.filter((d: any) => d.status === "Compliant" || d.status === "Active").length
    const compliantPercentage = totalDocuments > 0 ? ((compliant / totalDocuments) * 100).toFixed(1) : "0"
    
    const byDocType = documents.reduce((acc: any, doc: any) => {
      if (!acc[doc.documentType]) acc[doc.documentType] = 0
      acc[doc.documentType] += 1
      return acc
    }, {})

    return {
      totalDocuments,
      overdue,
      expiringSoon,
      compliant,
      compliantPercentage,
      byDocType,
    }
  }, [documents])

  const groupedData = useMemo(() => {
    if (groupBy === "none") return []

    const groups: Record<string, any> = {}

    documents.forEach((doc: any) => {
      let key = ""
      
      switch (groupBy) {
        case "documentType":
          key = doc.documentType
          break
        case "location":
          const site = sites.find((s: any) => s.id === doc.siteId)
          key = site?.name || "Unknown"
          break
        case "status":
          key = doc.status
          break
      }

      if (!groups[key]) {
        groups[key] = {
          key,
          count: 0,
          overdue: 0,
          expiringSoon: 0,
          compliant: 0,
        }
      }

      groups[key].count += 1
      if (doc.status === "Overdue") groups[key].overdue += 1
      else if (doc.status === "Expiring Soon" || doc.status === "Critical") groups[key].expiringSoon += 1
      else groups[key].compliant += 1
    })

    return Object.values(groups).sort((a: any, b: any) => b.count - a.count)
  }, [documents, groupBy, sites])

  const locationFilterOptions = useMemo(() => sites.map((site: any) => ({ id: site.id, name: site.name })), [sites])
  const documentTypeOptions = useMemo(() => [
    { id: "Right to Work", name: "Right to Work" },
    { id: "DBS Check", name: "DBS Check" },
    { id: "Contract", name: "Contract" },
    { id: "Training Certificate", name: "Training Certificate" },
    { id: "Health & Safety", name: "Health & Safety" },
    { id: "Food Hygiene", name: "Food Hygiene" },
    { id: "Other", name: "Other" },
  ], [])
  const statusOptions = useMemo(() => [
    { id: "Overdue", name: "Overdue" },
    { id: "Critical", name: "Critical (&lt;7d)" },
    { id: "Expiring Soon", name: "Expiring Soon (&lt;30d)" },
    { id: "Compliant", name: "Compliant" },
    { id: "Active", name: "Active" },
    { id: "Pending", name: "Pending" },
  ], [])
  
  const groupByOptions = useMemo(() => [
    { value: "none", label: "No Grouping" },
    { value: "documentType", label: "By Document Type" },
    { value: "location", label: "By Location" },
    { value: "status", label: "By Status" },
  ], [])

  const reportRef = React.useRef<HTMLDivElement | null>(null)

  return (
    <Box ref={reportRef}>
      <DataHeader
        showDateControls={true}
        showDateTypeSelector={false}
        dateType={dateType}
        currentDate={customStartDate}
        onDateChange={setCustomStartDate}
        additionalControls={headerControls}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onCustomDateRangeChange={(start, end) => {
          setCustomStartDate(start)
          setCustomEndDate(end)
        }}
        filters={[
          {
            label: "Location",
            options: locationFilterOptions,
            selectedValues: selectedLocations,
            onSelectionChange: setSelectedLocations,
          },
          {
            label: "Document Type",
            options: documentTypeOptions,
            selectedValues: selectedDocumentTypes,
            onSelectionChange: setSelectedDocumentTypes,
          },
          {
            label: "Status",
            options: statusOptions,
            selectedValues: selectedStatuses,
            onSelectionChange: setSelectedStatuses,
          },
        ]}
        groupByOptions={groupByOptions}
        groupByValue={groupBy}
        onGroupByChange={(value) => setGroupBy(value as GroupByType)}
        onExportCSV={() => exportReportContainerToCsv(reportRef.current, "employee-documentation-tracker-report.csv")}
        onExportPDF={() => exportReportContainerToPdf(reportRef.current, "Employee Documentation Tracker Report", "employee-documentation-tracker-report.pdf")}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Documents</Typography>
              <Typography variant="h5">{metrics.totalDocuments}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Overdue</Typography>
              <Typography variant="h5" color="error">{metrics.overdue}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Expiring Soon</Typography>
              <Typography variant="h5" color="warning.main">{metrics.expiringSoon}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Compliant</Typography>
              <Typography variant="h5" color="success.main">{metrics.compliantPercentage}%</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>By Document Type</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Object.entries(metrics.byDocType).map(([type, count]) => (
          <Grid item xs={6} sm={4} md={2} key={type}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="caption">{type}</Typography>
                <Typography variant="h6">{count as number}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {groupBy !== "none" && groupedData.length > 0 && (
        <>
          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            Breakdown by {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}
          </Typography>
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">Overdue</TableCell>
                  <TableCell align="right">Expiring Soon</TableCell>
                  <TableCell align="right">Compliant</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupedData.map((row: any) => (
                  <TableRow key={row.key}>
                    <TableCell>{row.key}</TableCell>
                    <TableCell align="right"><strong>{row.count}</strong></TableCell>
                    <TableCell align="right">
                      <Chip label={row.overdue} size="small" color="error" />
                    </TableCell>
                    <TableCell align="right">
                      <Chip label={row.expiringSoon} size="small" color="warning" />
                    </TableCell>
                    <TableCell align="right">
                      <Chip label={row.compliant} size="small" color="success" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Document Details</Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell>Document Type</TableCell>
              <TableCell>Issue Date</TableCell>
              <TableCell>Expiry Date</TableCell>
              <TableCell align="right">Days Until Expiry</TableCell>
              <TableCell>Uploaded By</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.length > 0 ? (
              documents.slice(0, 50).map((doc: any) => (
                <TableRow key={doc.id} sx={{ 
                  backgroundColor: doc.status === "Overdue" ? "error.lighter" : 
                                  doc.status === "Critical" ? "error.light" : 
                                  doc.status === "Expiring Soon" ? "warning.light" : "inherit"
                }}>
                  <TableCell>{doc.employeeName}</TableCell>
                  <TableCell>{doc.documentType}</TableCell>
                  <TableCell>{doc.issueDate ? format(doc.issueDate, "dd/MM/yyyy") : "-"}</TableCell>
                  <TableCell>
                    <strong>{doc.expiryDate ? format(doc.expiryDate, "dd/MM/yyyy") : "-"}</strong>
                  </TableCell>
                  <TableCell align="right">
                    {doc.expiryDate ? (
                      <strong style={{
                        color: doc.daysUntilExpiry < 0 ? "#d32f2f" : 
                              doc.daysUntilExpiry <= 7 ? "#d32f2f" :
                              doc.daysUntilExpiry <= 30 ? "#f57c00" : "#2e7d32"
                      }}>
                        {doc.daysUntilExpiry}
                      </strong>
                    ) : "-"}
                  </TableCell>
                  <TableCell>{doc.uploadedBy}</TableCell>
                  <TableCell>
                    <Chip 
                      label={doc.status} 
                      size="small" 
                      color={
                        doc.status === "Overdue" || doc.status === "Critical" ? "error" :
                        doc.status === "Expiring Soon" ? "warning" : "success"
                      }
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <EmptyStateCard
                    icon={ArticleIcon}
                    title="No documents found"
                    description="Documents can be tracked through compliance tasks or employee document uploads."
                    cardSx={{ maxWidth: 560, mx: "auto", boxShadow: "none" }}
                    contentSx={{ py: 2 }}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {documents.length > 50 && (
        <Typography variant="caption" sx={{ mt: 1, display: "block" }}>
          Showing 50 of {documents.length} documents.
        </Typography>
      )}
    </Box>
  )
}

export default EmployeeDocumentationTrackerReport




