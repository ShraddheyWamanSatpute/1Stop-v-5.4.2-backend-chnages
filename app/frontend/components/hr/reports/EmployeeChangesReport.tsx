"use client"

import React, { useEffect, useMemo, useState } from "react"
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
import { Edit as EditIcon } from "@mui/icons-material"
import { format } from "date-fns"
import { useHRReportContext } from "../../../../backend/context/AnalyticsContext"
import { useNotifications } from "../../../../backend/context/NotificationsContext"
import DataHeader from "../../reusable/DataHeader"
import {
  calculateDateRange,
  isDateInRange,
  safeString,
  safeParseDate,
} from "../../../utils/reportHelpers"
import { exportReportContainerToCsv, exportReportContainerToPdf } from "../../../utils/reportExport"
import type { HRReportProps } from "./reportTypes"
import EmptyStateCard from "../../reusable/EmptyStateCard"

type GroupByType = "none" | "department" | "changeType" | "month"

const EmployeeChangesReport: React.FC<HRReportProps> = ({ headerControls }) => {
  const { hrState, companyState } = useHRReportContext()
  const { state: notificationsState, refreshNotifications } = useNotifications()
  const { employees = [], departments = [] } = hrState
  const { sites = [] } = companyState

  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("month")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [customStartDate, setCustomStartDate] = useState<Date>(new Date(new Date().setMonth(new Date().getMonth() - 3)))
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date())
  const [groupBy, setGroupBy] = useState<GroupByType>("none")
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [selectedChangeTypes, setSelectedChangeTypes] = useState<string[]>([])
  const reportRef = React.useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    refreshNotifications(500).catch(() => {})
  }, [refreshNotifications])

  const { startDate, endDate } = useMemo(() => {
    return calculateDateRange(dateType, currentDate, customStartDate, customEndDate)
  }, [dateType, currentDate, customStartDate, customEndDate])

  const employeeChanges = useMemo(() => {
    try {
      const changes = (notificationsState.notifications || [])
        .filter((notification: any) => notification.type === "hr")
        .filter((notification: any) => notification.metadata?.section === "HR/Employee")
        .filter((notification: any) => isDateInRange(notification.timestamp || notification.createdAt, startDate, endDate))
        .map((notification: any) => {
          const employeeId = safeString(notification.details?.entityId || notification.metadata?.entityId)
          const employee = employees.find((emp: any) => emp.id === employeeId)
          const departmentId = safeString(
            employee?.departmentId ||
            notification.details?.newValue?.departmentId ||
            notification.details?.oldValue?.departmentId,
          )

          return {
            id: notification.id,
            employeeId,
            employeeName: safeString(
              notification.details?.entityName ||
              (employee ? `${safeString(employee.firstName)} ${safeString(employee.lastName)}` : "Unknown Employee"),
            ),
            departmentId,
            changeType: notification.action.charAt(0).toUpperCase() + notification.action.slice(1),
            oldValue: JSON.stringify(notification.details?.oldValue ?? {}),
            newValue: JSON.stringify(notification.details?.newValue ?? {}),
            effectiveDate: safeParseDate(notification.timestamp || notification.createdAt) || new Date(),
            siteId: safeString(notification.siteId || notification.metadata?.siteId),
          }
        })

      return changes.filter((change: any) => {
        const matchesLocation = selectedLocations.length === 0 || selectedLocations.includes(safeString(change.siteId))
        const matchesDepartment = selectedDepartments.length === 0 || selectedDepartments.includes(safeString(change.departmentId))
        const matchesType = selectedChangeTypes.length === 0 || selectedChangeTypes.includes(safeString(change.changeType))
        return matchesLocation && matchesDepartment && matchesType
      })
    } catch (error) {
      console.error("Error calculating employee changes:", error)
      return []
    }
  }, [notificationsState.notifications, employees, startDate, endDate, selectedLocations, selectedDepartments, selectedChangeTypes])

  const metrics = useMemo(() => {
    const totalChanges = employeeChanges.length
    const created = employeeChanges.filter((c: any) => c.changeType === "Created").length
    const updated = employeeChanges.filter((c: any) => c.changeType === "Updated").length
    const deleted = employeeChanges.filter((c: any) => c.changeType === "Deleted").length

    return {
      totalChanges,
      created,
      updated,
      deleted,
    }
  }, [employeeChanges])

  const groupedData = useMemo(() => {
    if (groupBy === "none") return []

    const groups: Record<string, any> = {}

    employeeChanges.forEach((change: any) => {
      let key = ""

      switch (groupBy) {
        case "department": {
          const dept = departments.find((d: any) => d.id === change.departmentId)
          key = dept?.name || "Unknown"
          break
        }
        case "changeType":
          key = change.changeType
          break
        case "month":
          key = format(change.effectiveDate, "MMMM yyyy")
          break
      }

      if (!groups[key]) {
        groups[key] = {
          key,
          count: 0,
          created: 0,
          updated: 0,
          deleted: 0,
        }
      }

      groups[key].count += 1
      if (change.changeType === "Created") groups[key].created += 1
      if (change.changeType === "Updated") groups[key].updated += 1
      if (change.changeType === "Deleted") groups[key].deleted += 1
    })

    return Object.values(groups).sort((a: any, b: any) => b.count - a.count)
  }, [employeeChanges, groupBy, departments])

  const locationFilterOptions = useMemo(() => sites.map((site: any) => ({ id: site.id, name: site.name })), [sites])
  const departmentFilterOptions = useMemo(() => departments.map((dept: any) => ({ id: dept.id, name: dept.name })), [departments])
  const changeTypeOptions = useMemo(() => {
    return Array.from(new Set(employeeChanges.map((change: any) => safeString(change.changeType))))
      .filter(Boolean)
      .map((changeType) => ({ id: changeType, name: changeType }))
  }, [employeeChanges])
  const groupByOptions = useMemo(() => [
    { value: "none", label: "No Grouping" },
    { value: "department", label: "By Department" },
    { value: "changeType", label: "By Change Type" },
    { value: "month", label: "By Month" },
  ], [])

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
            label: "Change Type",
            options: changeTypeOptions,
            selectedValues: selectedChangeTypes,
            onSelectionChange: setSelectedChangeTypes,
          },
        ]}
        groupByOptions={groupByOptions}
        groupByValue={groupBy}
        onGroupByChange={(value) => setGroupBy(value as GroupByType)}
        onExportCSV={() => exportReportContainerToCsv(reportRef.current, "employee-changes-report.csv")}
        onExportPDF={() => exportReportContainerToPdf(reportRef.current, "Employee Changes Report", "employee-changes-report.pdf")}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Changes</Typography>
              <Typography variant="h5">{metrics.totalChanges}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Created</Typography>
              <Typography variant="h5" color="success.main">{metrics.created}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Updated</Typography>
              <Typography variant="h5">{metrics.updated}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Deleted</Typography>
              <Typography variant="h5">{metrics.deleted}</Typography>
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
                  <TableCell align="right">Total Changes</TableCell>
                  <TableCell align="right">Created</TableCell>
                  <TableCell align="right">Updated</TableCell>
                  <TableCell align="right">Deleted</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupedData.map((row: any) => (
                  <TableRow key={row.key}>
                    <TableCell>{row.key}</TableCell>
                    <TableCell align="right"><strong>{row.count}</strong></TableCell>
                    <TableCell align="right">
                      <Chip label={row.created} size="small" color="success" />
                    </TableCell>
                    <TableCell align="right">{row.updated}</TableCell>
                    <TableCell align="right">{row.deleted}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Employee Change Details</Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Change Type</TableCell>
              <TableCell>Old Value</TableCell>
              <TableCell>New Value</TableCell>
              <TableCell>Effective Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employeeChanges.length > 0 ? (
              employeeChanges.slice(0, 50).map((change: any) => {
                const dept = departments.find((d: any) => d.id === change.departmentId)

                return (
                  <TableRow key={change.id}>
                    <TableCell>{change.employeeName}</TableCell>
                    <TableCell>{dept?.name || "-"}</TableCell>
                    <TableCell>
                      <Chip
                        label={change.changeType}
                        size="small"
                        color={change.changeType === "Created" ? "success" : change.changeType === "Deleted" ? "warning" : "primary"}
                      />
                    </TableCell>
                    <TableCell>{change.oldValue}</TableCell>
                    <TableCell><strong>{change.newValue}</strong></TableCell>
                    <TableCell>{format(change.effectiveDate, "dd/MM/yyyy")}</TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <EmptyStateCard
                    icon={EditIcon}
                    title="No employee changes recorded"
                    description="Employee change history will appear here once HR audit notifications have been generated."
                    cardSx={{ maxWidth: 720, mx: "auto", boxShadow: "none" }}
                    contentSx={{ py: 2 }}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {employeeChanges.length > 50 && (
        <Typography variant="caption" sx={{ mt: 1, display: "block" }}>
          Showing 50 of {employeeChanges.length} changes.
        </Typography>
      )}
    </Box>
  )
}

export default EmployeeChangesReport
