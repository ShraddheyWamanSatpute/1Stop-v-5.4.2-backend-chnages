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
import { format, subDays } from "date-fns"
import { 
  filterByCompanyContext, 
  safeArray,
  safeString 
} from "../../../utils/reportHelpers"
import { exportReportContainerToCsv, exportReportContainerToPdf } from "../../../utils/reportExport"
import type { HRReportProps } from "./reportTypes"

type GroupByType = "none" | "department" | "location" | "employmentType" | "status"

const EmployeeDirectoryReport: React.FC<HRReportProps> = ({ headerControls }) => {
  const { hrState, companyState } = useHRReportContext()
  const { employees = [], departments = [] } = hrState
  const { sites = [] } = companyState

  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("month")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [customStartDate, setCustomStartDate] = useState<Date>(subDays(new Date(), 30))
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date())
  const [groupBy, setGroupBy] = useState<GroupByType>("none")
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [selectedEmploymentTypes, setSelectedEmploymentTypes] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [sortValue, setSortValue] = useState<string>("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const filteredEmployees = useMemo(() => {
    try {
      // Filter employees by company context first
      const contextFilteredEmployees = filterByCompanyContext(
        safeArray(employees),
        companyState.selectedSiteID,
        companyState.selectedSubsiteID
      )
      
      const filtered = contextFilteredEmployees.filter((employee: any) => {
        const matchesLocation = selectedLocations.length === 0 || selectedLocations.includes(safeString(employee.siteId))
        const matchesDepartment = selectedDepartments.length === 0 || selectedDepartments.includes(safeString(employee.departmentId || employee.department))
        const matchesEmploymentType = selectedEmploymentTypes.length === 0 || selectedEmploymentTypes.includes(safeString(employee.employmentType))
        const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(safeString(employee.status))
        
        return matchesLocation && matchesDepartment && matchesEmploymentType && matchesStatus
      })

      const q = safeString(searchTerm).trim().toLowerCase()
      if (!q) return filtered

      return filtered.filter((employee: any) => {
        const fullName = `${safeString(employee.firstName)} ${safeString(employee.lastName)}`.trim().toLowerCase()
        const email = safeString(employee.email).toLowerCase()
        const phone = safeString(employee.phone).toLowerCase()
        const jobTitle = safeString(employee.jobTitle || employee.position).toLowerCase()
        const employeeId = safeString(employee.employeeID || employee.id).toLowerCase()
        return (
          fullName.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          jobTitle.includes(q) ||
          employeeId.includes(q)
        )
      })
    } catch (error) {
      console.error("Error filtering employees:", error)
      return []
    }
  }, [
    employees,
    selectedLocations,
    selectedDepartments,
    selectedEmploymentTypes,
    selectedStatuses,
    companyState.selectedSiteID,
    companyState.selectedSubsiteID,
    searchTerm,
  ])

  const sortedEmployees = useMemo(() => {
    const list = [...filteredEmployees]
    const dir = sortDirection === "asc" ? 1 : -1

    const getDeptName = (employee: any) => {
      const deptId = employee.departmentId || employee.department
      const dept = safeArray(departments).find((d: any) => d.id === deptId)
      return safeString(dept?.name || deptId)
    }

    const getSiteName = (employee: any) => {
      const site = safeArray(sites).find((s: any) => s.id === employee.siteId)
      return safeString(site?.name || employee.siteId)
    }

    list.sort((a: any, b: any) => {
      if (sortValue === "name") {
        const av = `${safeString(a.firstName)} ${safeString(a.lastName)}`.trim().toLowerCase()
        const bv = `${safeString(b.firstName)} ${safeString(b.lastName)}`.trim().toLowerCase()
        return av.localeCompare(bv) * dir
      }
      if (sortValue === "status") {
        return safeString(a.status).localeCompare(safeString(b.status)) * dir
      }
      if (sortValue === "department") {
        return getDeptName(a).toLowerCase().localeCompare(getDeptName(b).toLowerCase()) * dir
      }
      if (sortValue === "location") {
        return getSiteName(a).toLowerCase().localeCompare(getSiteName(b).toLowerCase()) * dir
      }
      return 0
    })
    return list
  }, [filteredEmployees, sortDirection, sortValue, departments, sites])

  const metrics = useMemo(() => {
    try {
      const totalEmployees = filteredEmployees.length
      const activeEmployees = filteredEmployees.filter((e: any) => safeString(e.status) === "active").length
      const inactiveEmployees = filteredEmployees.filter((e: any) => {
        const status = safeString(e.status)
        return status === "inactive" || status === "on_leave"
      }).length
      const leavers = filteredEmployees.filter((e: any) => safeString(e.status) === "terminated").length
    
      const fullTimeEmployees = filteredEmployees.filter((e: any) => e.isFullTime || safeString(e.employmentType) === "full-time").length
      const partTimeEmployees = filteredEmployees.filter((e: any) => !e.isFullTime || safeString(e.employmentType) === "part-time").length
      const contractors = filteredEmployees.filter((e: any) => safeString(e.employmentType) === "contractor").length

      // Department breakdown
      const departmentBreakdown = filteredEmployees.reduce((acc: any, employee: any) => {
        const deptId = safeString(employee.departmentId || employee.department, "Unknown")
        const dept = safeArray(departments).find((d: any) => d.id === deptId)
        const deptName = dept?.name || deptId
        if (!acc[deptName]) acc[deptName] = 0
        acc[deptName] += 1
        return acc
      }, {})

      return {
        totalEmployees,
        activeEmployees,
        inactiveEmployees,
        leavers,
        fullTimeEmployees,
        partTimeEmployees,
        contractors,
        departmentBreakdown,
      }
    } catch (error) {
      console.error("Error calculating metrics:", error)
      return {
        totalEmployees: 0,
        activeEmployees: 0,
        inactiveEmployees: 0,
        leavers: 0,
        fullTimeEmployees: 0,
        partTimeEmployees: 0,
        contractors: 0,
        departmentBreakdown: {},
      }
    }
  }, [filteredEmployees, departments])

  const groupedData = useMemo(() => {
    if (groupBy === "none") return []

    const groups: Record<string, any> = {}

    filteredEmployees.forEach((employee: any) => {
      let key = ""
      
      switch (groupBy) {
        case "department":
          const deptId = employee.departmentId || employee.department || "Unknown"
          const dept = departments.find((d: any) => d.id === deptId)
          key = dept?.name || deptId
          break
        case "location":
          const site = sites.find((s: any) => s.id === employee.siteId)
          key = site?.name || employee.siteId || "Unknown"
          break
        case "employmentType":
          key = employee.employmentType || (employee.isFullTime ? "Full-Time" : "Part-Time")
          break
        case "status":
          key = employee.status || "Unknown"
          break
      }

      if (!groups[key]) {
        groups[key] = {
          key,
          total: 0,
          active: 0,
          inactive: 0,
          fullTime: 0,
          partTime: 0,
        }
      }

      groups[key].total += 1
      if (employee.status === "active") groups[key].active += 1
      if (employee.status === "inactive" || employee.status === "on_leave") groups[key].inactive += 1
      if (employee.isFullTime || employee.employmentType === "full-time") groups[key].fullTime += 1
      else groups[key].partTime += 1
    })

    return Object.values(groups).sort((a: any, b: any) => b.total - a.total)
  }, [filteredEmployees, groupBy, departments, sites])

  const locationFilterOptions = useMemo(() => 
    sites.map((site: any) => ({ id: site.id, name: site.name })),
    [sites]
  )

  const departmentFilterOptions = useMemo(() => 
    departments.map((dept: any) => ({ id: dept.id, name: dept.name })),
    [departments]
  )

  const employmentTypeOptions = useMemo(() => [
    { id: "full-time", name: "Full-Time" },
    { id: "part-time", name: "Part-Time" },
    { id: "contractor", name: "Contractor" },
    { id: "temporary", name: "Temporary" },
  ], [])

  const statusOptions = useMemo(() => [
    { id: "active", name: "Active" },
    { id: "inactive", name: "Inactive" },
    { id: "on_leave", name: "On Leave" },
    { id: "terminated", name: "Leaver" },
  ], [])

  const groupByOptions = useMemo(() => [
    { value: "none", label: "No Grouping" },
    { value: "department", label: "By Department" },
    { value: "location", label: "By Location" },
    { value: "employmentType", label: "By Employment Type" },
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
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search employees..."
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
            label: "Employment Type",
            options: employmentTypeOptions,
            selectedValues: selectedEmploymentTypes,
            onSelectionChange: setSelectedEmploymentTypes,
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
        sortOptions={[
          { value: "name", label: "Name" },
          { value: "department", label: "Department" },
          { value: "location", label: "Location" },
          { value: "status", label: "Status" },
        ]}
        sortValue={sortValue}
        sortDirection={sortDirection}
        onSortChange={(value, direction) => {
          setSortValue(value)
          setSortDirection(direction)
        }}
        onExportCSV={() => exportReportContainerToCsv(reportRef.current, "employee-directory-report.csv")}
        onExportPDF={() => exportReportContainerToPdf(reportRef.current, "Employee Directory Report", "employee-directory-report.pdf")}
      />

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Employees</Typography>
              <Typography variant="h5">{metrics.totalEmployees}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Active</Typography>
              <Typography variant="h5" color="success.main">{metrics.activeEmployees}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Inactive/On Leave</Typography>
              <Typography variant="h5" color="warning.main">{metrics.inactiveEmployees}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Leavers</Typography>
              <Typography variant="h5" color="error">{metrics.leavers}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Full-Time</Typography>
              <Typography variant="h6">{metrics.fullTimeEmployees}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Part-Time</Typography>
              <Typography variant="h6">{metrics.partTimeEmployees}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Contractors</Typography>
              <Typography variant="h6">{metrics.contractors}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Department Breakdown */}
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Department Breakdown</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Object.entries(metrics.departmentBreakdown).slice(0, 6).map(([dept, count]) => (
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
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">Active</TableCell>
                  <TableCell align="right">Inactive</TableCell>
                  <TableCell align="right">Full-Time</TableCell>
                  <TableCell align="right">Part-Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupedData.map((row: any) => (
                  <TableRow key={row.key}>
                    <TableCell>{row.key}</TableCell>
                    <TableCell align="right"><strong>{row.total}</strong></TableCell>
                    <TableCell align="right">
                      <Chip label={row.active} size="small" color="success" />
                    </TableCell>
                    <TableCell align="right">
                      <Chip label={row.inactive} size="small" color={row.inactive > 0 ? "warning" : "default"} />
                    </TableCell>
                    <TableCell align="right">{row.fullTime}</TableCell>
                    <TableCell align="right">{row.partTime}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Employee List Table */}
      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Employee Directory</Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Employee ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Job Title</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>Employment Type</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedEmployees.slice(0, 50).map((employee: any) => {
              const dept = departments.find((d: any) => d.id === (employee.departmentId || employee.department))
              const site = sites.find((s: any) => s.id === employee.siteId)
              
              return (
                <TableRow key={employee.id}>
                  <TableCell>{employee.employeeID || employee.id}</TableCell>
                  <TableCell>{employee.firstName} {employee.lastName}</TableCell>
                  <TableCell>{employee.jobTitle || employee.position || "-"}</TableCell>
                  <TableCell>{dept?.name || "-"}</TableCell>
                  <TableCell>{site?.name || "-"}</TableCell>
                  <TableCell>{employee.hireDate ? format(new Date(employee.hireDate), "dd/MM/yyyy") : "-"}</TableCell>
                  <TableCell>{employee.employmentType || (employee.isFullTime ? "Full-Time" : "Part-Time")}</TableCell>
                  <TableCell>{employee.email || employee.phone || "-"}</TableCell>
                  <TableCell>
                    <Chip 
                      label={employee.status || "active"} 
                      size="small" 
                      color={employee.status === "active" ? "success" : employee.status === "terminated" ? "error" : "warning"}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
      {sortedEmployees.length > 50 && (
        <Typography variant="caption" sx={{ mt: 1, display: "block" }}>
          Showing 50 of {sortedEmployees.length} employees. Use filters/search to narrow results.
        </Typography>
      )}
    </Box>
  )
}

export default EmployeeDirectoryReport
