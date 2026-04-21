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
import { format, differenceInDays } from "date-fns"
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

type GroupByType = "none" | "employee" | "department" | "month"

const SicknessLogReport: React.FC<HRReportProps> = ({ headerControls }) => {
  const { hrState, companyState } = useHRReportContext()
  const { timeOffs = [], employees = [], departments = [] } = hrState
  const { sites = [] } = companyState

  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("month")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [customStartDate, setCustomStartDate] = useState<Date>(new Date(new Date().setMonth(new Date().getMonth() - 1)))
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date())
  const [groupBy, setGroupBy] = useState<GroupByType>("none")
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [selectedCertified, setSelectedCertified] = useState<string[]>([])

  const { startDate, endDate } = useMemo(() => {
    return calculateDateRange(dateType, currentDate, customStartDate, customEndDate)
  }, [dateType, currentDate, customStartDate, customEndDate])

  const sickLeaves = useMemo(() => {
    try {
      // Filter employees by company context first (through timeOffs)
      const contextFilteredEmployees = filterByCompanyContext(
        safeArray(employees),
        companyState.selectedSiteID,
        companyState.selectedSubsiteID
      )
      const employeeIds = new Set(contextFilteredEmployees.map((e: any) => e.id))
      
      return safeArray(timeOffs)
        .filter((leave: any) => {
          if (!employeeIds.has(leave.employeeId)) return false
          const leaveType = safeString(leave.type)
          return leaveType === "sick_leave" || leaveType === "sickness"
        })
        .filter((leave: any) => {
          const leaveStartDate = safeParseDate(leave.startDate)
          const leaveEndDate = safeParseDate(leave.endDate)
          
          if (!leaveStartDate || !leaveEndDate) return false
          
          const withinDateRange = isDateInRange(leave.startDate, startDate, endDate) ||
                                isDateInRange(leave.endDate, startDate, endDate) ||
                                (leaveStartDate <= startDate && leaveEndDate >= endDate)
          
          const employee = contextFilteredEmployees.find((e: any) => e.id === leave.employeeId)
          const matchesLocation = selectedLocations.length === 0 || selectedLocations.includes(safeString(employee?.siteId))
          const matchesDepartment = selectedDepartments.length === 0 || selectedDepartments.includes(safeString(employee?.departmentId))
          
          const isCertified = leave.certified || leave.doctorNote || leave.medicalCertificate
          const certifiedValue = isCertified ? "yes" : "no"
          const matchesCertified = selectedCertified.length === 0 || selectedCertified.includes(certifiedValue)
          
          return withinDateRange && matchesLocation && matchesDepartment && matchesCertified
        })
      .map((leave: any) => ({
        ...leave,
        isCertified: !!(leave.certified || leave.doctorNote || leave.medicalCertificate)
      }))
    } catch (error) {
      console.error("Error filtering sick leaves:", error)
      return []
    }
  }, [timeOffs, employees, startDate, endDate, selectedLocations, selectedDepartments, selectedCertified, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const metrics = useMemo(() => {
    try {
      const totalSickLeaves = sickLeaves.length
      const totalDays = sickLeaves.reduce((sum: number, leave: any) => {
        const start = safeParseDate(leave.startDate)
        const end = safeParseDate(leave.endDate)
        if (!start || !end) return sum
        return sum + differenceInDays(end, start) + 1
      }, 0)
      
      const certified = sickLeaves.filter((l: any) => l.isCertified).length
      const uncertified = totalSickLeaves - certified
      const certifiedPercentage = totalSickLeaves > 0 ? ((certified / totalSickLeaves) * 100).toFixed(1) : "0"
      
      const employeeCount = safeArray(employees).length
      const avgDaysPerEmployee = employeeCount > 0 ? (totalDays / employeeCount).toFixed(1) : "0"
      
      // Frequent sick employees (>5 sick days)
      const employeeSickDays: Record<string, number> = {}
      sickLeaves.forEach((leave: any) => {
        if (!employeeSickDays[leave.employeeId]) employeeSickDays[leave.employeeId] = 0
        const start = safeParseDate(leave.startDate)
        const end = safeParseDate(leave.endDate)
        if (start && end) {
          employeeSickDays[leave.employeeId] += differenceInDays(end, start) + 1
        }
      })
      const frequentSick = Object.values(employeeSickDays).filter((days: number) => days > 5).length

      return {
        totalSickLeaves,
        totalDays,
        certified,
        uncertified,
        certifiedPercentage,
        avgDaysPerEmployee,
        frequentSick,
      }
    } catch (error) {
      console.error("Error calculating metrics:", error)
      return {
        totalSickLeaves: 0,
        totalDays: 0,
        certified: 0,
        uncertified: 0,
        certifiedPercentage: "0",
        avgDaysPerEmployee: "0",
        frequentSick: 0,
      }
    }
  }, [sickLeaves, employees])

  const groupedData = useMemo(() => {
    if (groupBy === "none") return []

    const groups: Record<string, any> = {}

    sickLeaves.forEach((leave: any) => {
      let key = ""
      
      switch (groupBy) {
        case "employee":
          const employee = employees.find((e: any) => e.id === leave.employeeId)
          key = employee ? `${employee.firstName} ${employee.lastName}` : "Unknown"
          break
        case "department":
          const emp = employees.find((e: any) => e.id === leave.employeeId)
          const dept = departments.find((d: any) => d.id === emp?.departmentId)
          key = dept?.name || "Unknown"
          break
        case "month":
          key = format(new Date(leave.startDate), "MMMM yyyy")
          break
      }

      if (!groups[key]) {
        groups[key] = {
          key,
          count: 0,
          days: 0,
          certified: 0,
          uncertified: 0,
        }
      }

      groups[key].count += 1
      const start = new Date(leave.startDate)
      const end = new Date(leave.endDate)
      groups[key].days += differenceInDays(end, start) + 1
      
      if (leave.isCertified) groups[key].certified += 1
      else groups[key].uncertified += 1
    })

    return Object.values(groups).sort((a: any, b: any) => b.days - a.days)
  }, [sickLeaves, groupBy, employees, departments])

  const locationFilterOptions = useMemo(() => sites.map((site: any) => ({ id: site.id, name: site.name })), [sites])
  const departmentFilterOptions = useMemo(() => departments.map((dept: any) => ({ id: dept.id, name: dept.name })), [departments])
  const certifiedOptions = useMemo(() => [
    { id: "yes", name: "Certified" },
    { id: "no", name: "Not Certified" },
  ], [])
  
  const groupByOptions = useMemo(() => [
    { value: "none", label: "No Grouping" },
    { value: "employee", label: "By Employee" },
    { value: "department", label: "By Department" },
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
            label: "Certified",
            options: certifiedOptions,
            selectedValues: selectedCertified,
            onSelectionChange: setSelectedCertified,
          },
        ]}
        groupByOptions={groupByOptions}
        groupByValue={groupBy}
        onGroupByChange={(value) => setGroupBy(value as GroupByType)}
        onExportCSV={() => exportReportContainerToCsv(reportRef.current, "sickness-log-report.csv")}
        onExportPDF={() => exportReportContainerToPdf(reportRef.current, "Sickness Log Report", "sickness-log-report.pdf")}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Sick Leaves</Typography>
              <Typography variant="h5">{metrics.totalSickLeaves}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Sick Days</Typography>
              <Typography variant="h5">{metrics.totalDays}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Avg Days/Employee</Typography>
              <Typography variant="h5">{metrics.avgDaysPerEmployee}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Frequent Sick (&gt;5d)</Typography>
              <Typography variant="h5" color="warning.main">{metrics.frequentSick}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Certified</Typography>
              <Typography variant="h6" color="success.main">{metrics.certified}</Typography>
              <Typography variant="caption" color="text.secondary">{metrics.certifiedPercentage}%</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Uncertified</Typography>
              <Typography variant="h6" color="warning.main">{metrics.uncertified}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Certification Rate</Typography>
              <Typography variant="h6">{metrics.certifiedPercentage}%</Typography>
            </CardContent>
          </Card>
        </Grid>
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
                  <TableCell align="right">Count</TableCell>
                  <TableCell align="right">Total Days</TableCell>
                  <TableCell align="right">Certified</TableCell>
                  <TableCell align="right">Uncertified</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupedData.map((row: any) => (
                  <TableRow key={row.key}>
                    <TableCell>{row.key}</TableCell>
                    <TableCell align="right"><strong>{row.count}</strong></TableCell>
                    <TableCell align="right">{row.days}</TableCell>
                    <TableCell align="right">
                      <Chip label={row.certified} size="small" color="success" />
                    </TableCell>
                    <TableCell align="right">
                      <Chip label={row.uncertified} size="small" color="warning" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Sickness Log Details</Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>End Date</TableCell>
              <TableCell align="right">Duration (Days)</TableCell>
              <TableCell>Certified</TableCell>
              <TableCell>Reason</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sickLeaves.slice(0, 50).map((leave: any) => {
              const employee = employees.find((e: any) => e.id === leave.employeeId)
              const dept = departments.find((d: any) => d.id === employee?.departmentId)
              const start = new Date(leave.startDate)
              const end = new Date(leave.endDate)
              const days = differenceInDays(end, start) + 1
              
              return (
                <TableRow key={leave.id}>
                  <TableCell>{employee ? `${employee.firstName} ${employee.lastName}` : "Unknown"}</TableCell>
                  <TableCell>{dept?.name || "-"}</TableCell>
                  <TableCell>{format(start, "dd/MM/yyyy")}</TableCell>
                  <TableCell>{format(end, "dd/MM/yyyy")}</TableCell>
                  <TableCell align="right"><strong>{days}</strong></TableCell>
                  <TableCell>
                    <Chip 
                      label={leave.isCertified ? "Yes" : "No"} 
                      size="small" 
                      color={leave.isCertified ? "success" : "warning"}
                    />
                  </TableCell>
                  <TableCell>{leave.reason || "-"}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
      {sickLeaves.length > 50 && (
        <Typography variant="caption" sx={{ mt: 1, display: "block" }}>
          Showing 50 of {sickLeaves.length} sick leaves.
        </Typography>
      )}
    </Box>
  )
}

export default SicknessLogReport




