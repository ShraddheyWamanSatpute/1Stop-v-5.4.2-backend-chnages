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
import { format, differenceInDays, subDays } from "date-fns"
import { 
  calculateDateRange, 
  filterByCompanyContext, 
  isDateInRange, 
  safeArray,
  safeString,
  safeParseDate 
} from "../../../utils/reportHelpers"
import { exportReportContainerToCsv, exportReportContainerToPdf } from "../../../utils/reportExport"
import type { HRReportProps } from "./reportTypes"

type GroupByType = "none" | "employee" | "department" | "absenceType" | "status"

const AbsenceSummaryReport: React.FC<HRReportProps> = ({ headerControls }) => {
  const { hrState, companyState } = useHRReportContext()
  const { timeOffs = [], employees = [], departments = [] } = hrState
  const { sites = [] } = companyState

  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("month")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [customStartDate, setCustomStartDate] = useState<Date>(subDays(new Date(), 30))
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date())
  const [groupBy, setGroupBy] = useState<GroupByType>("none")
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [selectedAbsenceTypes, setSelectedAbsenceTypes] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])

  const { startDate, endDate } = useMemo(() => {
    return calculateDateRange(dateType, currentDate, customStartDate, customEndDate)
  }, [dateType, currentDate, customStartDate, customEndDate])

  const filteredAbsences = useMemo(() => {
    try {
      // Filter timeOffs by company context first (through employees)
      const contextFilteredEmployees = filterByCompanyContext(
        safeArray(employees),
        companyState.selectedSiteID,
        companyState.selectedSubsiteID
      )
      const employeeIds = new Set(contextFilteredEmployees.map((e: any) => e.id))
      
      return safeArray(timeOffs).filter((absence: any) => {
        // Check if absence belongs to a context-filtered employee
        if (!employeeIds.has(absence.employeeId)) return false
        
        const absenceStartDate = safeParseDate(absence.startDate)
        const absenceEndDate = safeParseDate(absence.endDate)
        
        if (!absenceStartDate || !absenceEndDate) return false
        
        // Check if absence overlaps with date range
        const withinDateRange = isDateInRange(absence.startDate, startDate, endDate) ||
                              isDateInRange(absence.endDate, startDate, endDate) ||
                              (absenceStartDate <= startDate && absenceEndDate >= endDate)
        
        const employee = contextFilteredEmployees.find((e: any) => e.id === absence.employeeId)
        const matchesLocation = selectedLocations.length === 0 || selectedLocations.includes(safeString(employee?.siteId))
        const matchesDepartment = selectedDepartments.length === 0 || selectedDepartments.includes(safeString(employee?.departmentId))
        const matchesType = selectedAbsenceTypes.length === 0 || selectedAbsenceTypes.includes(safeString(absence.type))
        const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(safeString(absence.status))
        
        return withinDateRange && matchesLocation && matchesDepartment && matchesType && matchesStatus
      })
    } catch (error) {
      console.error("Error filtering absences:", error)
      return []
    }
  }, [timeOffs, employees, startDate, endDate, selectedLocations, selectedDepartments, selectedAbsenceTypes, selectedStatuses, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const metrics = useMemo(() => {
    try {
      const totalAbsences = filteredAbsences.length
      const totalDays = filteredAbsences.reduce((sum: number, absence: any) => {
        const start = safeParseDate(absence.startDate)
        const end = safeParseDate(absence.endDate)
        if (!start || !end) return sum
        return sum + differenceInDays(end, start) + 1
      }, 0)
      
      const approved = filteredAbsences.filter((a: any) => safeString(a.status) === "approved").length
      const pending = filteredAbsences.filter((a: any) => safeString(a.status) === "pending").length
      const rejected = filteredAbsences.filter((a: any) => safeString(a.status) === "rejected").length
      
      const byType = filteredAbsences.reduce((acc: any, absence: any) => {
        const type = safeString(absence.type, "Other")
        if (!acc[type]) acc[type] = { count: 0, days: 0 }
        acc[type].count += 1
        const start = safeParseDate(absence.startDate)
        const end = safeParseDate(absence.endDate)
        if (start && end) {
          acc[type].days += differenceInDays(end, start) + 1
        }
        return acc
      }, {})
      
      const avgDaysPerAbsence = totalAbsences > 0 ? (totalDays / totalAbsences).toFixed(1) : "0"

      return {
        totalAbsences,
        totalDays,
        approved,
        pending,
        rejected,
        byType,
        avgDaysPerAbsence,
      }
    } catch (error) {
      console.error("Error calculating metrics:", error)
      return {
        totalAbsences: 0,
        totalDays: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        byType: {},
        avgDaysPerAbsence: "0",
      }
    }
  }, [filteredAbsences])

  const groupedData = useMemo(() => {
    if (groupBy === "none") return []

    const groups: Record<string, any> = {}

    filteredAbsences.forEach((absence: any) => {
      let key = ""
      
      switch (groupBy) {
        case "employee":
          const employee = employees.find((e: any) => e.id === absence.employeeId)
          key = employee ? `${employee.firstName} ${employee.lastName}` : "Unknown"
          break
        case "department":
          const emp = employees.find((e: any) => e.id === absence.employeeId)
          const dept = departments.find((d: any) => d.id === emp?.departmentId)
          key = dept?.name || "Unknown"
          break
        case "absenceType":
          key = absence.type || "Other"
          break
        case "status":
          key = absence.status || "Unknown"
          break
      }

      if (!groups[key]) {
        groups[key] = {
          key,
          count: 0,
          days: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
        }
      }

      groups[key].count += 1
      // Safely parse dates
      const start = safeParseDate(absence.startDate)
      const end = safeParseDate(absence.endDate)
      if (start && end) {
        groups[key].days += differenceInDays(end, start) + 1
      } else {
        // If dates are invalid, default to 1 day
        groups[key].days += 1
      }
      
      if (absence.status === "approved") groups[key].approved += 1
      if (absence.status === "pending") groups[key].pending += 1
      if (absence.status === "rejected") groups[key].rejected += 1
    })

    return Object.values(groups).sort((a: any, b: any) => b.days - a.days)
  }, [filteredAbsences, groupBy, employees, departments])

  const locationFilterOptions = useMemo(() => 
    sites.map((site: any) => ({ id: site.id, name: site.name })),
    [sites]
  )

  const departmentFilterOptions = useMemo(() => 
    departments.map((dept: any) => ({ id: dept.id, name: dept.name })),
    [departments]
  )

  const absenceTypeOptions = useMemo(() => [
    { id: "annual_leave", name: "Annual Leave" },
    { id: "sick_leave", name: "Sick Leave" },
    { id: "unpaid_leave", name: "Unpaid Leave" },
    { id: "parental_leave", name: "Parental Leave" },
    { id: "compassionate_leave", name: "Compassionate Leave" },
    { id: "other", name: "Other" },
  ], [])

  const statusOptions = useMemo(() => [
    { id: "approved", name: "Approved" },
    { id: "pending", name: "Pending" },
    { id: "rejected", name: "Rejected" },
  ], [])

  const groupByOptions = useMemo(() => [
    { value: "none", label: "No Grouping" },
    { value: "employee", label: "By Employee" },
    { value: "department", label: "By Department" },
    { value: "absenceType", label: "By Absence Type" },
    { value: "status", label: "By Status" },
  ], [])

  const reportRef = React.useRef<HTMLDivElement | null>(null)

  return (
    <Box ref={reportRef}>
      <DataHeader
        showDateControls={true}
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        dateType={dateType}
        onDateTypeChange={setDateType}
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
            label: "Department",
            options: departmentFilterOptions,
            selectedValues: selectedDepartments,
            onSelectionChange: setSelectedDepartments,
          },
          {
            label: "Absence Type",
            options: absenceTypeOptions,
            selectedValues: selectedAbsenceTypes,
            onSelectionChange: setSelectedAbsenceTypes,
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
        onExportCSV={() => exportReportContainerToCsv(reportRef.current, "absence-summary-report.csv")}
        onExportPDF={() => exportReportContainerToPdf(reportRef.current, "Absence Summary Report", "absence-summary-report.pdf")}
      />

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Absences</Typography>
              <Typography variant="h5">{metrics.totalAbsences}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Days</Typography>
              <Typography variant="h5">{metrics.totalDays}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Avg Days/Absence</Typography>
              <Typography variant="h5">{metrics.avgDaysPerAbsence}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Pending Approval</Typography>
              <Typography variant="h5" color="warning.main">{metrics.pending}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Approved</Typography>
              <Typography variant="h6" color="success.main">{metrics.approved}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Pending</Typography>
              <Typography variant="h6" color="warning.main">{metrics.pending}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Rejected</Typography>
              <Typography variant="h6" color="error">{metrics.rejected}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Absence by Type */}
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Absence by Type</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Object.entries(metrics.byType).map(([type, data]: [string, any]) => (
          <Grid item xs={6} sm={4} md={3} key={type}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="caption">{type}</Typography>
                <Typography variant="h6">{data.count}</Typography>
                <Typography variant="caption" color="text.secondary">{data.days} days</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Grouped Data Table */}
      {groupBy !== "none" && groupedData.length > 0 && (
        <>
          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            Breakdown by {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}</TableCell>
                  <TableCell align="right">Count</TableCell>
                  <TableCell align="right">Total Days</TableCell>
                  <TableCell align="right">Approved</TableCell>
                  <TableCell align="right">Pending</TableCell>
                  <TableCell align="right">Rejected</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupedData.map((row: any) => (
                  <TableRow key={row.key}>
                    <TableCell>{row.key}</TableCell>
                    <TableCell align="right"><strong>{row.count}</strong></TableCell>
                    <TableCell align="right">{row.days}</TableCell>
                    <TableCell align="right">
                      <Chip label={row.approved} size="small" color="success" />
                    </TableCell>
                    <TableCell align="right">
                      <Chip label={row.pending} size="small" color="warning" />
                    </TableCell>
                    <TableCell align="right">
                      <Chip label={row.rejected} size="small" color="error" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Detailed Absence List */}
      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Absence Details</Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell>Absence Type</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>End Date</TableCell>
              <TableCell align="right">Total Days</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAbsences.slice(0, 50).map((absence: any) => {
              const employee = employees.find((e: any) => e.id === absence.employeeId)
              const start = new Date(absence.startDate)
              const end = new Date(absence.endDate)
              const days = differenceInDays(end, start) + 1
              
              return (
                <TableRow key={absence.id}>
                  <TableCell>{employee ? `${employee.firstName} ${employee.lastName}` : "Unknown"}</TableCell>
                  <TableCell>{absence.type || "Other"}</TableCell>
                  <TableCell>{format(start, "dd/MM/yyyy")}</TableCell>
                  <TableCell>{format(end, "dd/MM/yyyy")}</TableCell>
                  <TableCell align="right">{days}</TableCell>
                  <TableCell>{absence.reason || "-"}</TableCell>
                  <TableCell>
                    <Chip 
                      label={absence.status || "pending"} 
                      size="small" 
                      color={absence.status === "approved" ? "success" : absence.status === "rejected" ? "error" : "warning"}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
      {filteredAbsences.length > 50 && (
        <Typography variant="caption" sx={{ mt: 1, display: "block" }}>
          Showing 50 of {filteredAbsences.length} absences. Use filters to narrow results.
        </Typography>
      )}
    </Box>
  )
}

export default AbsenceSummaryReport




