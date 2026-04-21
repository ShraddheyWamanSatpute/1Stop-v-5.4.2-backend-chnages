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
import { format } from "date-fns"
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

type GroupByType = "none" | "department" | "location" | "reason" | "month"

const LeaverFormReport: React.FC<HRReportProps> = ({ headerControls }) => {
  const { hrState, companyState } = useHRReportContext()
  const { employees = [], departments = [] } = hrState
  const { sites = [] } = companyState

  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("month")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [customStartDate, setCustomStartDate] = useState<Date>(new Date(new Date().setMonth(new Date().getMonth() - 3)))
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date())
  const [groupBy, setGroupBy] = useState<GroupByType>("none")
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [selectedReasons, setSelectedReasons] = useState<string[]>([])

  const { startDate, endDate } = useMemo(() => {
    return calculateDateRange(dateType, currentDate, customStartDate, customEndDate)
  }, [dateType, currentDate, customStartDate, customEndDate])

  const leavers = useMemo(() => {
    try {
      // Filter employees by company context first
      const contextFilteredEmployees = filterByCompanyContext(
        safeArray(employees),
        companyState.selectedSiteID,
        companyState.selectedSubsiteID
      )
      
      return contextFilteredEmployees.filter((emp: any) => {
        const status = safeString(emp.status)
        const isTerminated = status === "terminated" || status === "left" || emp.isLeaver
        if (!isTerminated) return false
        
        const endDateValue = safeParseDate(emp.endDate || emp.terminationDate || emp.leavingDate)
        
        if (!endDateValue) return false
        
        const withinDateRange = isDateInRange(emp.endDate || emp.terminationDate || emp.leavingDate, startDate, endDate)
        const matchesLocation = selectedLocations.length === 0 || selectedLocations.includes(safeString(emp.siteId))
        const matchesDepartment = selectedDepartments.length === 0 || selectedDepartments.includes(safeString(emp.departmentId))
        const matchesReason = selectedReasons.length === 0 || selectedReasons.includes(safeString(emp.leavingReason || emp.terminationReason))
        
        return withinDateRange && matchesLocation && matchesDepartment && matchesReason
      })
      .map((emp: any) => ({
        ...emp,
        finalDate: safeParseDate(emp.endDate || emp.terminationDate || emp.leavingDate),
        reason: emp.leavingReason || emp.terminationReason || "Unknown",
        exitInterviewCompleted: emp.exitInterviewCompleted || emp.exitInterview || false,
      }))
    } catch (error) {
      console.error("Error filtering leavers:", error)
      return []
    }
  }, [employees, startDate, endDate, selectedLocations, selectedDepartments, selectedReasons, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const metrics = useMemo(() => {
    try {
      const totalLeavers = leavers.length
      const totalActiveEmployees = safeArray(employees).filter((e: any) => safeString(e.status) === "active").length
      const turnoverRate = totalActiveEmployees > 0 ? ((totalLeavers / (totalActiveEmployees + totalLeavers)) * 100).toFixed(1) : "0"
      
      const exitInterviewCompleted = leavers.filter((l: any) => l.exitInterviewCompleted).length
      const exitInterviewRate = totalLeavers > 0 ? ((exitInterviewCompleted / totalLeavers) * 100).toFixed(1) : "0"
      
      const byReason = leavers.reduce((acc: any, emp: any) => {
        const reason = safeString(emp.reason, "Unknown")
        if (!acc[reason]) acc[reason] = 0
        acc[reason] += 1
        return acc
      }, {})
      
      const byDepartment = leavers.reduce((acc: any, emp: any) => {
        const deptId = safeString(emp.departmentId || emp.department, "Unknown")
        const dept = safeArray(departments).find((d: any) => d.id === deptId)
        const deptName = safeString(dept?.name, deptId)
        if (!acc[deptName]) acc[deptName] = 0
        acc[deptName] += 1
        return acc
      }, {})

      return {
        totalLeavers,
        turnoverRate,
        exitInterviewCompleted,
        exitInterviewRate,
        byReason,
        byDepartment,
      }
    } catch (error) {
      console.error("Error calculating metrics:", error)
      return {
        totalLeavers: 0,
        turnoverRate: "0",
        exitInterviewCompleted: 0,
        exitInterviewRate: "0",
        byReason: {},
        byDepartment: {},
      }
    }
  }, [leavers, employees, departments])

  const groupedData = useMemo(() => {
    if (groupBy === "none") return []

    const groups: Record<string, any> = {}

    leavers.forEach((emp: any) => {
      let key = ""
      
      switch (groupBy) {
        case "department":
          const dept = departments.find((d: any) => d.id === (emp.departmentId || emp.department))
          key = dept?.name || "Unknown"
          break
        case "location":
          const site = sites.find((s: any) => s.id === emp.siteId)
          key = site?.name || "Unknown"
          break
        case "reason":
          key = emp.reason
          break
        case "month":
          key = format(emp.finalDate, "MMMM yyyy")
          break
      }

      if (!groups[key]) {
        groups[key] = {
          key,
          count: 0,
          exitInterviewCompleted: 0,
        }
      }

      groups[key].count += 1
      if (emp.exitInterviewCompleted) groups[key].exitInterviewCompleted += 1
    })

    return Object.values(groups).sort((a: any, b: any) => b.count - a.count)
  }, [leavers, groupBy, departments, sites])

  const locationFilterOptions = useMemo(() => sites.map((site: any) => ({ id: site.id, name: site.name })), [sites])
  const departmentFilterOptions = useMemo(() => departments.map((dept: any) => ({ id: dept.id, name: dept.name })), [departments])
  const reasonOptions = useMemo(() => [
    { id: "Resignation", name: "Resignation" },
    { id: "Retirement", name: "Retirement" },
    { id: "Dismissal", name: "Dismissal" },
    { id: "Contract End", name: "Contract End" },
    { id: "Redundancy", name: "Redundancy" },
    { id: "Other", name: "Other" },
  ], [])
  
  const groupByOptions = useMemo(() => [
    { value: "none", label: "No Grouping" },
    { value: "department", label: "By Department" },
    { value: "location", label: "By Location" },
    { value: "reason", label: "By Reason" },
    { value: "month", label: "By Month" },
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
            label: "Reason",
            options: reasonOptions,
            selectedValues: selectedReasons,
            onSelectionChange: setSelectedReasons,
          },
        ]}
        groupByOptions={groupByOptions}
        groupByValue={groupBy}
        onGroupByChange={(value) => setGroupBy(value as GroupByType)}
        onExportCSV={() => exportReportContainerToCsv(reportRef.current, "leaver-form-report.csv")}
        onExportPDF={() => exportReportContainerToPdf(reportRef.current, "Leaver Form Report", "leaver-form-report.pdf")}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Leavers</Typography>
              <Typography variant="h5">{metrics.totalLeavers}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Turnover Rate</Typography>
              <Typography variant="h5" color="warning.main">{metrics.turnoverRate}%</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Exit Interviews Done</Typography>
              <Typography variant="h5">{metrics.exitInterviewCompleted}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Exit Interview Rate</Typography>
              <Typography variant="h5" color="success.main">{metrics.exitInterviewRate}%</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>By Leaving Reason</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Object.entries(metrics.byReason).map(([reason, count]) => (
          <Grid item xs={6} sm={4} md={2} key={reason}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="caption">{reason}</Typography>
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
                  <TableCell align="right">Total Leavers</TableCell>
                  <TableCell align="right">Exit Interviews</TableCell>
                  <TableCell align="right">Completion %</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupedData.map((row: any) => {
                  const completionRate = row.count > 0 ? ((row.exitInterviewCompleted / row.count) * 100).toFixed(0) : "0"
                  return (
                    <TableRow key={row.key}>
                      <TableCell>{row.key}</TableCell>
                      <TableCell align="right"><strong>{row.count}</strong></TableCell>
                      <TableCell align="right">
                        <Chip label={row.exitInterviewCompleted} size="small" color="success" />
                      </TableCell>
                      <TableCell align="right">{completionRate}%</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Leaver Details</Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Final Working Day</TableCell>
              <TableCell>Leaving Reason</TableCell>
              <TableCell>Notice Period</TableCell>
              <TableCell>Exit Interview</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {leavers.slice(0, 50).map((emp: any) => {
              const dept = departments.find((d: any) => d.id === (emp.departmentId || emp.department))
              const noticePeriod = emp.noticePeriod || "-"
              
              return (
                <TableRow key={emp.id}>
                  <TableCell>{emp.firstName} {emp.lastName}</TableCell>
                  <TableCell>{dept?.name || "-"}</TableCell>
                  <TableCell><strong>{emp.finalDate ? format(emp.finalDate, "dd/MM/yyyy") : "-"}</strong></TableCell>
                  <TableCell>{emp.reason}</TableCell>
                  <TableCell>{noticePeriod}</TableCell>
                  <TableCell>
                    <Chip 
                      label={emp.exitInterviewCompleted ? "Completed" : "Pending"} 
                      size="small" 
                      color={emp.exitInterviewCompleted ? "success" : "warning"}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
      {leavers.length > 50 && (
        <Typography variant="caption" sx={{ mt: 1, display: "block" }}>
          Showing 50 of {leavers.length} leavers.
        </Typography>
      )}
    </Box>
  )
}

export default LeaverFormReport
