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
import { format, differenceInMonths } from "date-fns"
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

type GroupByType = "none" | "department" | "location" | "contractType" | "month"

const NewStarterFormReport: React.FC<HRReportProps> = ({ headerControls }) => {
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
  const [selectedManagers, setSelectedManagers] = useState<string[]>([])

  const { startDate, endDate } = useMemo(() => {
    return calculateDateRange(dateType, currentDate, customStartDate, customEndDate)
  }, [dateType, currentDate, customStartDate, customEndDate])

  const newStarters = useMemo(() => {
    try {
      // Filter employees by company context first
      const contextFilteredEmployees = filterByCompanyContext(
        safeArray(employees),
        companyState.selectedSiteID,
        companyState.selectedSubsiteID
      )
      
      return contextFilteredEmployees.filter((emp: any) => {
        const hireDate = safeParseDate(emp.hireDate)
        const startDateValue = safeParseDate(emp.startDate)
        const joinDate = hireDate || startDateValue
        
        if (!joinDate) return false
        
        const withinDateRange = isDateInRange(emp.hireDate || emp.startDate, startDate, endDate)
        const matchesLocation = selectedLocations.length === 0 || selectedLocations.includes(safeString(emp.siteId))
        const matchesDepartment = selectedDepartments.length === 0 || selectedDepartments.includes(safeString(emp.departmentId))
        const matchesManager = selectedManagers.length === 0 || selectedManagers.includes(safeString(emp.manager))
        
        return withinDateRange && matchesLocation && matchesDepartment && matchesManager
      })
    } catch (error) {
      console.error("Error filtering new starters:", error)
      return []
    }
  }, [employees, startDate, endDate, selectedLocations, selectedDepartments, selectedManagers, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const metrics = useMemo(() => {
    const totalStarters = newStarters.length
    const fullTime = newStarters.filter((e: any) => e.isFullTime || e.employmentType === "full-time").length
    const partTime = newStarters.filter((e: any) => !e.isFullTime || e.employmentType === "part-time").length
    const contractors = newStarters.filter((e: any) => e.employmentType === "contractor").length
    
    const byDepartment = newStarters.reduce((acc: any, emp: any) => {
      const deptId = emp.departmentId || emp.department || "Unknown"
      const dept = departments.find((d: any) => d.id === deptId)
      const deptName = dept?.name || deptId
      if (!acc[deptName]) acc[deptName] = 0
      acc[deptName] += 1
      return acc
    }, {})
    
    const months = differenceInMonths(endDate, startDate) || 1
    const avgPerMonth = (totalStarters / months).toFixed(1)

    return {
      totalStarters,
      fullTime,
      partTime,
      contractors,
      byDepartment,
      avgPerMonth,
    }
  }, [newStarters, departments, startDate, endDate])

  const groupedData = useMemo(() => {
    if (groupBy === "none") return []

    const groups: Record<string, any> = {}

    newStarters.forEach((emp: any) => {
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
        case "contractType":
          key = emp.employmentType || (emp.isFullTime ? "Full-Time" : "Part-Time")
          break
        case "month":
          const joinDate = emp.hireDate ? new Date(emp.hireDate) : new Date(emp.startDate)
          key = format(joinDate, "MMMM yyyy")
          break
      }

      if (!groups[key]) {
        groups[key] = {
          key,
          count: 0,
          fullTime: 0,
          partTime: 0,
          contractors: 0,
        }
      }

      groups[key].count += 1
      if (emp.isFullTime || emp.employmentType === "full-time") groups[key].fullTime += 1
      else if (emp.employmentType === "contractor") groups[key].contractors += 1
      else groups[key].partTime += 1
    })

    return Object.values(groups).sort((a: any, b: any) => b.count - a.count)
  }, [newStarters, groupBy, departments, sites])

  const locationFilterOptions = useMemo(() => sites.map((site: any) => ({ id: site.id, name: site.name })), [sites])
  const departmentFilterOptions = useMemo(() => departments.map((dept: any) => ({ id: dept.id, name: dept.name })), [departments])
  const managerOptions = useMemo(() => {
    const managers = [...new Set(employees.map((e: any) => e.manager).filter(Boolean))]
    return managers.map((m: any) => ({ id: m, name: m }))
  }, [employees])
  
  const groupByOptions = useMemo(() => [
    { value: "none", label: "No Grouping" },
    { value: "department", label: "By Department" },
    { value: "location", label: "By Location" },
    { value: "contractType", label: "By Contract Type" },
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
            label: "Manager",
            options: managerOptions,
            selectedValues: selectedManagers,
            onSelectionChange: setSelectedManagers,
          },
        ]}
        groupByOptions={groupByOptions}
        groupByValue={groupBy}
        onGroupByChange={(value) => setGroupBy(value as GroupByType)}
        onExportCSV={() => exportReportContainerToCsv(reportRef.current, "new-starter-form-report.csv")}
        onExportPDF={() => exportReportContainerToPdf(reportRef.current, "New Starter Form Report", "new-starter-form-report.pdf")}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total New Starters</Typography>
              <Typography variant="h5">{metrics.totalStarters}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Avg per Month</Typography>
              <Typography variant="h5">{metrics.avgPerMonth}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4} md={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Full-Time</Typography>
              <Typography variant="h6">{metrics.fullTime}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4} md={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Part-Time</Typography>
              <Typography variant="h6">{metrics.partTime}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4} md={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Contractors</Typography>
              <Typography variant="h6">{metrics.contractors}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>By Department</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Object.entries(metrics.byDepartment).map(([dept, count]) => (
          <Grid item xs={6} sm={4} md={2} key={dept}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="caption">{dept}</Typography>
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
                  <TableCell align="right">Full-Time</TableCell>
                  <TableCell align="right">Part-Time</TableCell>
                  <TableCell align="right">Contractors</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupedData.map((row: any) => (
                  <TableRow key={row.key}>
                    <TableCell>{row.key}</TableCell>
                    <TableCell align="right"><strong>{row.count}</strong></TableCell>
                    <TableCell align="right">{row.fullTime}</TableCell>
                    <TableCell align="right">{row.partTime}</TableCell>
                    <TableCell align="right">{row.contractors}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>New Starter Details</Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>Position</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Manager</TableCell>
              <TableCell>Contract Type</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {newStarters.slice(0, 50).map((emp: any) => {
              const dept = departments.find((d: any) => d.id === (emp.departmentId || emp.department))
              const joinDate = emp.hireDate ? new Date(emp.hireDate) : emp.startDate ? new Date(emp.startDate) : null
              
              return (
                <TableRow key={emp.id}>
                  <TableCell>{emp.firstName} {emp.lastName}</TableCell>
                  <TableCell>{joinDate ? format(joinDate, "dd/MM/yyyy") : "-"}</TableCell>
                  <TableCell>{emp.jobTitle || emp.position || "-"}</TableCell>
                  <TableCell>{dept?.name || "-"}</TableCell>
                  <TableCell>{emp.manager || "-"}</TableCell>
                  <TableCell>{emp.employmentType || (emp.isFullTime ? "Full-Time" : "Part-Time")}</TableCell>
                  <TableCell>
                    <Chip 
                      label={emp.status || "active"} 
                      size="small" 
                      color={emp.status === "active" ? "success" : "default"}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
      {newStarters.length > 50 && (
        <Typography variant="caption" sx={{ mt: 1, display: "block" }}>
          Showing 50 of {newStarters.length} new starters.
        </Typography>
      )}
    </Box>
  )
}

export default NewStarterFormReport




