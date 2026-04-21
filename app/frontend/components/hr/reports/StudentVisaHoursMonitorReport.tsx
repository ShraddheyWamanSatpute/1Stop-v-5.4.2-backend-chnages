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
  safeArray,
  safeString,
  safeNumber
} from "../../../utils/reportHelpers"
import { exportReportContainerToCsv, exportReportContainerToPdf } from "../../../utils/reportExport"
import type { HRReportProps } from "./reportTypes"
import EmptyStateCard from "../../reusable/EmptyStateCard"
import { School as SchoolIcon } from "@mui/icons-material"

type GroupByType = "none" | "employee" | "department" | "week"

const StudentVisaHoursMonitorReport: React.FC<HRReportProps> = ({ headerControls }) => {
  const { hrState, companyState } = useHRReportContext()
  const { employees = [], departments = [], schedules = [], attendances = [] } = hrState
  const { sites = [] } = companyState

  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("week")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [customStartDate, setCustomStartDate] = useState<Date>(new Date())
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date())
  const [groupBy, setGroupBy] = useState<GroupByType>("none")
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [breachOnly, setBreachOnly] = useState<string[]>([])

  const { startDate, endDate } = useMemo(() => {
    return calculateDateRange(dateType, currentDate, customStartDate, customEndDate)
  }, [dateType, currentDate, customStartDate, customEndDate])

  const studentEmployees = useMemo(() => {
    try {
      // Filter employees by company context first
      const contextFilteredEmployees = filterByCompanyContext(
        safeArray(employees),
        companyState.selectedSiteID,
        companyState.selectedSubsiteID
      )
      
      return contextFilteredEmployees.filter((emp: any) => {
        const visaType = safeString(emp.visaType || emp.visa?.type, "").toLowerCase()
        return visaType.includes("student") || emp.isStudent || emp.studentVisa
      })
    } catch (error) {
      console.error("Error filtering student employees:", error)
      return []
    }
  }, [employees, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const studentHoursData = useMemo(() => {
    try {
      const hoursLimit = 20

      return studentEmployees
        .filter((emp: any) => {
          const matchesLocation = selectedLocations.length === 0 || selectedLocations.includes(safeString(emp.siteId))
          const matchesDepartment = selectedDepartments.length === 0 || selectedDepartments.includes(safeString(emp.departmentId))
          return matchesLocation && matchesDepartment
        })
        .map((emp: any) => {
          // Calculate hours from schedules
          const employeeSchedules = safeArray(schedules).filter((s: any) => {
            if (s.employeeId !== emp.id) return false
            try {
              const scheduleDate = s.date instanceof Date ? s.date : new Date(s.date)
              return scheduleDate >= startDate && scheduleDate <= endDate
            } catch {
              return false
            }
          })
          
          const scheduledHours = employeeSchedules.reduce((sum: number, schedule: any) => {
            return sum + safeNumber(schedule.hours || schedule.duration, 8)
          }, 0)
        
          // Calculate hours from attendances (clock-in/out)
          const employeeAttendances = safeArray(attendances).filter((a: any) => {
            if (a.employeeId !== emp.id) return false
            try {
              const attendanceDate = a.date instanceof Date ? a.date : new Date(a.date)
              return attendanceDate >= startDate && attendanceDate <= endDate
            } catch {
              return false
            }
          })
          
          const actualHours = employeeAttendances.reduce((sum: number, attendance: any) => {
            return sum + safeNumber(attendance.hoursWorked || attendance.totalHours, 0)
          }, 0)
          
          // Use actual hours if available, otherwise use scheduled
          const hoursWorked = actualHours > 0 ? actualHours : scheduledHours
          
          const percentage = (hoursWorked / hoursLimit) * 100
          const breach = hoursWorked > hoursLimit
          const atRisk = hoursWorked >= 18 && hoursWorked <= 20
        
        let status = "Compliant"
        if (breach) status = "Breach"
        else if (atRisk) status = "At Risk"
        
          return {
            ...emp,
            hoursWorked: Number(hoursWorked.toFixed(1)),
            hoursLimit,
            percentage,
            breach,
            atRisk,
            status,
            remaining: Math.max(0, hoursLimit - hoursWorked),
          }
        })
        .filter((emp: any) => {
          if (breachOnly.length === 0) return true
          if (breachOnly.includes("yes")) return emp.breach
          return true
        })
        .sort((a: any, b: any) => safeNumber(b.hoursWorked, 0) - safeNumber(a.hoursWorked, 0))
    } catch (error) {
      console.error("Error calculating student hours data:", error)
      return []
    }
  }, [studentEmployees, schedules, attendances, startDate, endDate, selectedLocations, selectedDepartments, breachOnly])

  const metrics = useMemo(() => {
    const totalStudents = studentHoursData.length
    const breaches = studentHoursData.filter((s: any) => s.breach).length
    const atRisk = studentHoursData.filter((s: any) => s.atRisk).length
    const compliant = studentHoursData.filter((s: any) => s.status === "Compliant").length
    const totalHours = studentHoursData.reduce((sum: number, s: any) => sum + s.hoursWorked, 0)
    const avgHours = totalStudents > 0 ? (totalHours / totalStudents).toFixed(1) : "0"

    return {
      totalStudents,
      breaches,
      atRisk,
      compliant,
      totalHours: totalHours.toFixed(1),
      avgHours,
    }
  }, [studentHoursData])

  const groupedData = useMemo(() => {
    if (groupBy === "none") return []

    const groups: Record<string, any> = {}

    studentHoursData.forEach((student: any) => {
      let key = ""
      
      switch (groupBy) {
        case "employee":
          key = `${student.firstName} ${student.lastName}`
          break
        case "department":
          const dept = departments.find((d: any) => d.id === student.departmentId)
          key = dept?.name || "Unknown"
          break
        case "week":
          key = format(startDate, "MMM dd, yyyy")
          break
      }

      if (!groups[key]) {
        groups[key] = {
          key,
          students: 0,
          totalHours: 0,
          breaches: 0,
          atRisk: 0,
          compliant: 0,
        }
      }

      groups[key].students += 1
      groups[key].totalHours += student.hoursWorked
      if (student.breach) groups[key].breaches += 1
      else if (student.atRisk) groups[key].atRisk += 1
      else groups[key].compliant += 1
    })

    return Object.values(groups).map((g: any) => ({
      ...g,
      avgHours: g.students > 0 ? (g.totalHours / g.students).toFixed(1) : "0",
    }))
  }, [studentHoursData, groupBy, departments, startDate])

  const locationFilterOptions = useMemo(() => sites.map((site: any) => ({ id: site.id, name: site.name })), [sites])
  const departmentFilterOptions = useMemo(() => departments.map((dept: any) => ({ id: dept.id, name: dept.name })), [departments])
  const breachOptions = useMemo(() => [
    { id: "yes", name: "Breaches Only" },
  ], [])
  
  const groupByOptions = useMemo(() => [
    { value: "none", label: "No Grouping" },
    { value: "employee", label: "By Employee" },
    { value: "department", label: "By Department" },
    { value: "week", label: "By Week" },
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
            label: "Show",
            options: breachOptions,
            selectedValues: breachOnly,
            onSelectionChange: setBreachOnly,
          },
        ]}
        groupByOptions={groupByOptions}
        groupByValue={groupBy}
        onGroupByChange={(value) => setGroupBy(value as GroupByType)}
        onExportCSV={() => exportReportContainerToCsv(reportRef.current, "student-visa-hours-report.csv")}
        onExportPDF={() => exportReportContainerToPdf(reportRef.current, "Student Visa Hours Monitor Report", "student-visa-hours-report.pdf")}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Students</Typography>
              <Typography variant="h5">{metrics.totalStudents}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Breaches (&gt;20h)</Typography>
              <Typography variant="h5" color="error">{metrics.breaches}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">At Risk (18-20h)</Typography>
              <Typography variant="h5" color="warning.main">{metrics.atRisk}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Compliant (&lt;18h)</Typography>
              <Typography variant="h5" color="success.main">{metrics.compliant}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={6}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Hours Worked</Typography>
              <Typography variant="h6">{metrics.totalHours}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={6}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Avg Hours/Student</Typography>
              <Typography variant="h6">{metrics.avgHours}</Typography>
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
                  <TableCell align="right">Students</TableCell>
                  <TableCell align="right">Total Hours</TableCell>
                  <TableCell align="right">Avg Hours</TableCell>
                  <TableCell align="right">Breaches</TableCell>
                  <TableCell align="right">At Risk</TableCell>
                  <TableCell align="right">Compliant</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupedData.map((row: any) => (
                  <TableRow key={row.key}>
                    <TableCell>{row.key}</TableCell>
                    <TableCell align="right">{row.students}</TableCell>
                    <TableCell align="right">{row.totalHours.toFixed(1)}</TableCell>
                    <TableCell align="right">{row.avgHours}</TableCell>
                    <TableCell align="right">
                      <Chip label={row.breaches} size="small" color="error" />
                    </TableCell>
                    <TableCell align="right">
                      <Chip label={row.atRisk} size="small" color="warning" />
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

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Student Hours Details (Week: {format(startDate, "MMM dd")} - {format(endDate, "MMM dd, yyyy")})
      </Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Visa Type</TableCell>
              <TableCell align="right">Hours Worked</TableCell>
              <TableCell align="right">Limit</TableCell>
              <TableCell align="right">Remaining</TableCell>
              <TableCell>Usage</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {studentHoursData.slice(0, 50).map((student: any) => {
              const dept = departments.find((d: any) => d.id === student.departmentId)
              
              return (
                <TableRow key={student.id} sx={{ 
                  backgroundColor: student.breach ? "error.lighter" : 
                                  student.atRisk ? "warning.light" : "inherit"
                }}>
                  <TableCell>{student.firstName} {student.lastName}</TableCell>
                  <TableCell>{dept?.name || "-"}</TableCell>
                  <TableCell>{student.visaType || "Student"}</TableCell>
                  <TableCell align="right">
                    <strong style={{
                      color: student.breach ? "#d32f2f" : 
                            student.atRisk ? "#f57c00" : "#2e7d32"
                    }}>
                      {student.hoursWorked}h
                    </strong>
                  </TableCell>
                  <TableCell align="right">{student.hoursLimit}h</TableCell>
                  <TableCell align="right">{student.remaining.toFixed(1)}h</TableCell>
                  <TableCell>
                    <Typography variant="caption">{student.percentage.toFixed(0)}%</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={student.status} 
                      size="small" 
                      color={
                        student.breach ? "error" :
                        student.atRisk ? "warning" : "success"
                      }
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
      {studentHoursData.length > 50 && (
        <Typography variant="caption" sx={{ mt: 1, display: "block" }}>
          Showing 50 of {studentHoursData.length} students.
        </Typography>
      )}
      {studentHoursData.length === 0 && (
        <Box sx={{ mt: 2 }}>
          <EmptyStateCard
            icon={SchoolIcon}
            title="No student visa hours found"
            description="No student visa employees found or no hours recorded for the selected period."
            cardSx={{ maxWidth: 560, mx: "auto", boxShadow: "none" }}
          />
        </Box>
      )}
    </Box>
  )
}

export default StudentVisaHoursMonitorReport




