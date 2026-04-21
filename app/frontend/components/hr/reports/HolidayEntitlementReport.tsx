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
import { differenceInDays } from "date-fns"
import { 
  calculateDateRange,
  filterByCompanyContext, 
  safeArray,
  safeString,
  safeNumber,
  safeParseDate 
} from "../../../utils/reportHelpers"
import { exportReportContainerToCsv, exportReportContainerToPdf } from "../../../utils/reportExport"
import type { HRReportProps } from "./reportTypes"

type GroupByType = "none" | "department" | "location"

const HolidayEntitlementReport: React.FC<HRReportProps> = ({ headerControls }) => {
  const { hrState, companyState } = useHRReportContext()
  const { employees = [], departments = [], timeOffs = [] } = hrState
  const { sites = [] } = companyState

  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("month")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [customStartDate, setCustomStartDate] = useState<Date>(new Date(new Date().setMonth(new Date().getMonth() - 1)))
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date())
  const [groupBy, setGroupBy] = useState<GroupByType>("none")
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])

  const { startDate, endDate } = useMemo(() => {
    return calculateDateRange(dateType, currentDate, customStartDate, customEndDate)
  }, [dateType, currentDate, customStartDate, customEndDate])

  const employeeHolidays = useMemo(() => {
    try {
      // Filter employees by company context first
      const contextFilteredEmployees = filterByCompanyContext(
        safeArray(employees),
        companyState.selectedSiteID,
        companyState.selectedSubsiteID
      )
      
      return contextFilteredEmployees
        .filter((emp: any) => safeString(emp.status) === "active")
        .filter((emp: any) => {
          const matchesLocation = selectedLocations.length === 0 || selectedLocations.includes(safeString(emp.siteId))
          const matchesDepartment = selectedDepartments.length === 0 || selectedDepartments.includes(safeString(emp.departmentId))
          return matchesLocation && matchesDepartment
        })
        .map((emp: any) => {
          const entitlement = safeNumber(emp.holidaysPerYear, 28)
          const usedLeaves = safeArray(timeOffs).filter((t: any) => 
            t.employeeId === emp.id &&
            safeString(t.type) === "annual_leave" &&
            safeString(t.status) === "approved" &&
            (() => {
              const leaveStart = safeParseDate(t.startDate)
              const leaveEnd = safeParseDate(t.endDate)
              if (!leaveStart || !leaveEnd) return false
              // overlap check
              return leaveStart <= endDate && leaveEnd >= startDate
            })()
          )
          const usedDays = usedLeaves.reduce((sum: number, leave: any) => {
            const start = safeParseDate(leave.startDate)
            const end = safeParseDate(leave.endDate)
            if (!start || !end) return sum
            return sum + differenceInDays(end, start) + 1
          }, 0)
          const remaining = entitlement - usedDays
          const percentage = entitlement > 0 ? (usedDays / entitlement) * 100 : 0

          return {
            ...emp,
            entitlement,
            usedDays,
            remaining,
            percentage,
          }
        })
    } catch (error) {
      console.error("Error calculating employee holidays:", error)
      return []
    }
  }, [
    employees,
    timeOffs,
    selectedLocations,
    selectedDepartments,
    companyState.selectedSiteID,
    companyState.selectedSubsiteID,
    startDate,
    endDate,
  ])

  const metrics = useMemo(() => {
    try {
      const totalEntitlement = employeeHolidays.reduce((sum: number, emp: any) => sum + safeNumber(emp.entitlement, 0), 0)
      const totalUsed = employeeHolidays.reduce((sum: number, emp: any) => sum + safeNumber(emp.usedDays, 0), 0)
      const totalRemaining = employeeHolidays.reduce((sum: number, emp: any) => sum + safeNumber(emp.remaining, 0), 0)
      const avgUsage = employeeHolidays.length > 0 ? (totalUsed / employeeHolidays.length).toFixed(1) : "0"
      const avgRemaining = employeeHolidays.length > 0 ? (totalRemaining / employeeHolidays.length).toFixed(1) : "0"
    
    const lowBalance = employeeHolidays.filter((emp: any) => emp.remaining < 5).length
    const highUsage = employeeHolidays.filter((emp: any) => emp.percentage > 75).length

    return {
      totalEntitlement,
      totalUsed,
      totalRemaining,
      avgUsage,
      avgRemaining,
      lowBalance,
      highUsage,
    }
    } catch (error) {
      console.error("Error calculating metrics:", error)
      return {
        totalEntitlement: 0,
        totalUsed: 0,
        totalRemaining: 0,
        avgUsage: "0",
        avgRemaining: "0",
        lowBalance: 0,
        highUsage: 0,
      }
    }
  }, [employeeHolidays])

  const groupedData = useMemo(() => {
    if (groupBy === "none") return []

    const groups: Record<string, any> = {}

    employeeHolidays.forEach((emp: any) => {
      let key = ""
      
      switch (groupBy) {
        case "department":
          const dept = departments.find((d: any) => d.id === emp.departmentId)
          key = dept?.name || "Unknown"
          break
        case "location":
          const site = sites.find((s: any) => s.id === emp.siteId)
          key = site?.name || "Unknown"
          break
      }

      if (!groups[key]) {
        groups[key] = {
          key,
          employees: 0,
          totalEntitlement: 0,
          totalUsed: 0,
          totalRemaining: 0,
        }
      }

      groups[key].employees += 1
      groups[key].totalEntitlement += emp.entitlement
      groups[key].totalUsed += emp.usedDays
      groups[key].totalRemaining += emp.remaining
    })

    return Object.values(groups).map((g: any) => ({
      ...g,
      avgUsage: g.employees > 0 ? (g.totalUsed / g.employees).toFixed(1) : "0",
      avgRemaining: g.employees > 0 ? (g.totalRemaining / g.employees).toFixed(1) : "0",
    }))
  }, [employeeHolidays, groupBy, departments, sites])

  const locationFilterOptions = useMemo(() => sites.map((site: any) => ({ id: site.id, name: site.name })), [sites])
  const departmentFilterOptions = useMemo(() => departments.map((dept: any) => ({ id: dept.id, name: dept.name })), [departments])
  const groupByOptions = useMemo(() => [
    { value: "none", label: "No Grouping" },
    { value: "department", label: "By Department" },
    { value: "location", label: "By Location" },
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
        ]}
        groupByOptions={groupByOptions}
        groupByValue={groupBy}
        onGroupByChange={(value) => setGroupBy(value as GroupByType)}
        onExportCSV={() => exportReportContainerToCsv(reportRef.current, "holiday-entitlement-report.csv")}
        onExportPDF={() => exportReportContainerToPdf(reportRef.current, "Holiday Entitlement Report", "holiday-entitlement-report.pdf")}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Employees</Typography>
              <Typography variant="h5">{employeeHolidays.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Entitlement</Typography>
              <Typography variant="h5">{metrics.totalEntitlement} days</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Used</Typography>
              <Typography variant="h5">{metrics.totalUsed} days</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Remaining</Typography>
              <Typography variant="h5" color="success.main">{metrics.totalRemaining} days</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Avg Used/Employee</Typography>
              <Typography variant="h6">{metrics.avgUsage} days</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Avg Remaining</Typography>
              <Typography variant="h6">{metrics.avgRemaining} days</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Low Balance (&lt;5)</Typography>
              <Typography variant="h6" color="warning.main">{metrics.lowBalance}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">High Usage (&gt;75%)</Typography>
              <Typography variant="h6" color="error">{metrics.highUsage}</Typography>
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
                  <TableCell align="right">Employees</TableCell>
                  <TableCell align="right">Total Entitlement</TableCell>
                  <TableCell align="right">Total Used</TableCell>
                  <TableCell align="right">Total Remaining</TableCell>
                  <TableCell align="right">Avg Usage</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupedData.map((row: any) => (
                  <TableRow key={row.key}>
                    <TableCell>{row.key}</TableCell>
                    <TableCell align="right">{row.employees}</TableCell>
                    <TableCell align="right">{row.totalEntitlement}</TableCell>
                    <TableCell align="right">{row.totalUsed}</TableCell>
                    <TableCell align="right">{row.totalRemaining}</TableCell>
                    <TableCell align="right">{row.avgUsage}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Employee Holiday Balances</Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell>Department</TableCell>
              <TableCell align="right">Entitlement</TableCell>
              <TableCell align="right">Used</TableCell>
              <TableCell align="right">Remaining</TableCell>
              <TableCell>Usage</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employeeHolidays.slice(0, 50).map((emp: any) => {
              const dept = departments.find((d: any) => d.id === emp.departmentId)
              return (
                <TableRow key={emp.id}>
                  <TableCell>{emp.firstName} {emp.lastName}</TableCell>
                  <TableCell>{dept?.name || "-"}</TableCell>
                  <TableCell align="right">{emp.entitlement}</TableCell>
                  <TableCell align="right">{emp.usedDays}</TableCell>
                  <TableCell align="right">
                    <strong style={{ color: emp.remaining < 5 ? "#d32f2f" : "#2e7d32" }}>
                      {emp.remaining}
                    </strong>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{emp.percentage.toFixed(0)}%</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={emp.remaining < 5 ? "Low" : emp.percentage > 75 ? "High Usage" : "OK"} 
                      size="small" 
                      color={emp.remaining < 5 ? "error" : emp.percentage > 75 ? "warning" : "success"}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
      {employeeHolidays.length > 50 && (
        <Typography variant="caption" sx={{ mt: 1, display: "block" }}>
          Showing 50 of {employeeHolidays.length} employees.
        </Typography>
      )}
    </Box>
  )
}

export default HolidayEntitlementReport
