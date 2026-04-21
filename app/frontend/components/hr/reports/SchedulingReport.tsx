"use client"

import React, { useMemo, useState } from "react"
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material"
import { differenceInCalendarDays, format, subDays } from "date-fns"
import { useHRReportContext } from "../../../../backend/context/AnalyticsContext"
import type { Employee, Schedule, TimeOff } from "../../../../backend/interfaces/HRs"
import DataHeader from "../../reusable/DataHeader"
import {
  calculateDateRange,
  filterByCompanyContext,
  safeArray,
  safeNumber,
  safeParseDate,
  safeString,
} from "../../../utils/reportHelpers"
import type { HRReportProps } from "./reportTypes"

type DateType = "day" | "week" | "month" | "custom"

type ShiftDetail = {
  id: string
  date: Date
  startTime: string
  endTime: string
  status: string
  shiftType: string
  netHours: number
  breakHours: number
  notes: string
}

type TimeOffDetail = {
  id: string
  type: string
  status: string
  startDate: Date
  endDate: Date
  overlapDays: number
}

type EmployeeReportRow = {
  employeeId: string
  name: string
  totalHours: number
  totalBreaks: number
  timeOffDays: number
  timeOffTypes: string
  shiftCount: number
  shifts: ShiftDetail[]
  timeOffEntries: TimeOffDetail[]
}

const roundTo2 = (value: number) => Math.round(value * 100) / 100

const formatLabel = (value: string) => {
  const cleaned = safeString(value, "-").replace(/_/g, " ")
  if (!cleaned) return "-"
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

const formatTimeValue = (value: string) => {
  const raw = safeString(value)
  if (!raw) return "-"
  if (/^\d{2}:\d{2}/.test(raw)) return raw.slice(0, 5)

  const parsed = safeParseDate(raw)
  return parsed ? format(parsed, "HH:mm") : raw
}

const getStatusChipColor = (
  status: string
): "default" | "error" | "warning" | "success" | "info" => {
  switch (status) {
    case "approved":
    case "confirmed":
    case "completed":
    case "finalized":
    case "present":
      return "success"
    case "pending":
    case "draft":
    case "scheduled":
      return "warning"
    case "late":
      return "info"
    case "cancelled":
    case "denied":
    case "rejected":
    case "absent":
    case "no_show":
      return "error"
    default:
      return "default"
  }
}

const getScheduleHours = (schedule: Schedule, scheduleDate: Date) => {
  let grossHours = Number.NaN

  const startTime = safeString((schedule as any).startTime)
  const endTime = safeString((schedule as any).endTime)
  if (startTime && endTime) {
    const baseDate = format(scheduleDate, "yyyy-MM-dd")
    const start = new Date(`${baseDate}T${startTime}`)
    let end = new Date(`${baseDate}T${endTime}`)
    if (end < start) {
      end = new Date(end.getTime() + 24 * 60 * 60 * 1000)
    }
    const diffMs = end.getTime() - start.getTime()
    if (!Number.isNaN(diffMs) && diffMs > 0) {
      grossHours = diffMs / (1000 * 60 * 60)
    }
  }

  if (Number.isNaN(grossHours)) {
    grossHours = safeNumber((schedule as any).adjustedHours, Number.NaN)
  }
  if (Number.isNaN(grossHours)) {
    grossHours = safeNumber((schedule as any).actualHours, 0)
  }

  const breakHours = Math.max(0, safeNumber((schedule as any).breakDuration, 0) / 60)
  return {
    breakHours: roundTo2(breakHours),
    netHours: roundTo2(Math.max(0, grossHours - breakHours)),
  }
}

const SchedulingReport: React.FC<HRReportProps> = ({ headerControls }) => {
  const { hrState, companyState } = useHRReportContext()
  const {
    employees = [],
    schedules = [],
    timeOffs = [],
  } = hrState as {
    employees?: Employee[]
    schedules?: Schedule[]
    timeOffs?: TimeOff[]
  }

  const [dateType, setDateType] = useState<DateType>("week")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [customStartDate, setCustomStartDate] = useState<Date>(subDays(new Date(), 7))
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date())
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)

  const { startDate, endDate } = useMemo(
    () => calculateDateRange(dateType, currentDate, customStartDate, customEndDate),
    [dateType, currentDate, customStartDate, customEndDate]
  )

  const contextEmployees = useMemo(
    () =>
      filterByCompanyContext(
        safeArray(employees),
        companyState.selectedSiteID,
        companyState.selectedSubsiteID
      ) as Employee[],
    [employees, companyState.selectedSiteID, companyState.selectedSubsiteID]
  )

  const rows = useMemo(() => {
    const byEmployee = new Map<string, EmployeeReportRow>()

    contextEmployees.forEach((employee) => {
      byEmployee.set(employee.id, {
        employeeId: employee.id,
        name:
          `${safeString((employee as any).firstName)} ${safeString((employee as any).lastName)}`.trim() ||
          `Employee ${employee.id}`,
        totalHours: 0,
        totalBreaks: 0,
        timeOffDays: 0,
        timeOffTypes: "",
        shiftCount: 0,
        shifts: [],
        timeOffEntries: [],
      })
    })

    safeArray(schedules).forEach((schedule) => {
      const employeeId = safeString((schedule as any).employeeId)
      const row = byEmployee.get(employeeId)
      if (!row) return

      const scheduleDate = safeParseDate((schedule as any).date)
      if (!scheduleDate || scheduleDate < startDate || scheduleDate > endDate) return

      const { netHours, breakHours } = getScheduleHours(schedule, scheduleDate)
      const status = safeString((schedule as any).status, "scheduled")

      row.shifts.push({
        id: safeString((schedule as any).id, `${employeeId}-${scheduleDate.getTime()}`),
        date: scheduleDate,
        startTime: safeString((schedule as any).startTime, "-"),
        endTime: safeString((schedule as any).endTime, "-"),
        status,
        shiftType: safeString((schedule as any).shiftType, "regular"),
        netHours,
        breakHours,
        notes: safeString((schedule as any).notes),
      })

      if (status !== "cancelled" && status !== "no_show") {
        row.totalHours += netHours
        row.totalBreaks += breakHours
        row.shiftCount += 1
      }
    })

    safeArray(timeOffs).forEach((timeOff) => {
      const employeeId = safeString((timeOff as any).employeeId)
      const row = byEmployee.get(employeeId)
      if (!row) return

      const timeOffStart = safeParseDate((timeOff as any).startDate)
      const timeOffEnd = safeParseDate((timeOff as any).endDate)
      if (!timeOffStart || !timeOffEnd) return
      if (timeOffStart > endDate || timeOffEnd < startDate) return

      const overlapStart = timeOffStart > startDate ? timeOffStart : startDate
      const overlapEnd = timeOffEnd < endDate ? timeOffEnd : endDate
      if (overlapStart > overlapEnd) return

      const overlapDays = differenceInCalendarDays(overlapEnd, overlapStart) + 1
      row.timeOffDays += overlapDays
      row.timeOffEntries.push({
        id: safeString((timeOff as any).id, `${employeeId}-${timeOffStart.getTime()}`),
        type: safeString((timeOff as any).type, "other"),
        status: safeString((timeOff as any).status, "pending"),
        startDate: timeOffStart,
        endDate: timeOffEnd,
        overlapDays,
      })
    })

    return Array.from(byEmployee.values())
      .map((row) => {
        const uniqueTypes = Array.from(
          new Set(row.timeOffEntries.map((entry) => formatLabel(entry.type)))
        )

        return {
          ...row,
          shifts: row.shifts.sort((a, b) => {
            const byDate = a.date.getTime() - b.date.getTime()
            if (byDate !== 0) return byDate
            return a.startTime.localeCompare(b.startTime)
          }),
          timeOffEntries: row.timeOffEntries.sort(
            (a, b) => a.startDate.getTime() - b.startDate.getTime()
          ),
          totalHours: roundTo2(row.totalHours),
          totalBreaks: roundTo2(row.totalBreaks),
          timeOffTypes: uniqueTypes.join(", "),
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [contextEmployees, endDate, schedules, startDate, timeOffs])

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => {
          acc.totalHours += row.totalHours
          acc.totalBreaks += row.totalBreaks
          acc.timeOffDays += row.timeOffDays
          acc.shiftCount += row.shiftCount
          return acc
        },
        { totalHours: 0, totalBreaks: 0, timeOffDays: 0, shiftCount: 0 }
      ),
    [rows]
  )

  const roundedTotals = useMemo(
    () => ({
      ...totals,
      totalHours: roundTo2(totals.totalHours),
      totalBreaks: roundTo2(totals.totalBreaks),
    }),
    [totals]
  )

  const selectedEmployee = useMemo(
    () => rows.find((row) => row.employeeId === selectedEmployeeId) || null,
    [rows, selectedEmployeeId]
  )

  const exportCSV = () => {
    const escapeCsv = (value: unknown) => {
      const text = value === null || value === undefined ? "" : String(value)
      return `"${text.replace(/"/g, '""')}"`
    }

    const lines = [
      ["Employee", "Shift Count", "Total Hours", "Total Breaks", "Leave Days", "Leave Types"]
        .map(escapeCsv)
        .join(","),
      ...rows.map((row) =>
        [
          row.name,
          row.shiftCount,
          row.totalHours.toFixed(2),
          row.totalBreaks.toFixed(2),
          row.timeOffDays.toFixed(0),
          row.timeOffTypes || "-",
        ]
          .map(escapeCsv)
          .join(",")
      ),
    ]

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const filename = `hr-scheduling-report-${format(startDate, "yyyy-MM-dd")}_to_${format(endDate, "yyyy-MM-dd")}.csv`

    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <Box>
      <DataHeader
        showDateControls={true}
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        dateType={dateType}
        onDateTypeChange={(value) => setDateType(value as DateType)}
        additionalControls={headerControls}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onCustomDateRangeChange={(start, end) => {
          setCustomStartDate(start)
          setCustomEndDate(end)
        }}
        onExportCSV={exportCSV}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">
                Employees
              </Typography>
              <Typography variant="h5">{rows.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">
                Counted Shifts
              </Typography>
              <Typography variant="h5">{totals.shiftCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">
                Total Hours
              </Typography>
              <Typography variant="h5">{roundedTotals.totalHours.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">
                Time Off (days)
              </Typography>
              <Typography variant="h5">{totals.timeOffDays.toFixed(0)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="h6" gutterBottom>
        Employee Hours / Breaks / Leave
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Hours are totalled from each shift in the selected range. Click a shift count to inspect that employee&apos;s shifts.
      </Typography>

      <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
        <Table
          size="small"
          sx={{
            minWidth: 900,
            tableLayout: "fixed",
            "& th, & td": { verticalAlign: "middle" },
          }}
        >
          <colgroup>
            <col style={{ width: "28%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "22%" }} />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>
                Shifts
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                Total Hours
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                Total Breaks
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                Leave Days
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Leave Types</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const canOpenDetails = row.shifts.length > 0 || row.timeOffEntries.length > 0

              return (
                <TableRow key={row.employeeId} hover>
                  <TableCell
                    sx={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={row.name}
                  >
                    {row.name}
                  </TableCell>
                  <TableCell align="center">
                    {canOpenDetails ? (
                      <Button size="small" onClick={() => setSelectedEmployeeId(row.employeeId)}>
                        {row.shifts.length === 1 ? "1 shift" : `${row.shifts.length} shifts`}
                      </Button>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    {row.totalHours.toFixed(2)}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    {row.totalBreaks.toFixed(2)}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    {row.timeOffDays.toFixed(0)}
                  </TableCell>
                  <TableCell
                    sx={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={row.timeOffTypes || "-"}
                  >
                    {row.timeOffTypes || "-"}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={Boolean(selectedEmployee)}
        onClose={() => setSelectedEmployeeId(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {selectedEmployee ? `${selectedEmployee.name} Shifts` : "Employee Shifts"}
        </DialogTitle>
        <DialogContent dividers>
          {selectedEmployee && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Range: {format(startDate, "dd MMM yyyy")} to {format(endDate, "dd MMM yyyy")}
              </Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">
                        Shifts
                      </Typography>
                      <Typography variant="h6">{selectedEmployee.shifts.length}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">
                        Total Hours
                      </Typography>
                      <Typography variant="h6">{selectedEmployee.totalHours.toFixed(2)}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">
                        Leave Days
                      </Typography>
                      <Typography variant="h6">{selectedEmployee.timeOffDays.toFixed(0)}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Typography variant="subtitle1" gutterBottom>
                Shift Breakdown
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Shift</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Hours</TableCell>
                      <TableCell align="right">Breaks</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedEmployee.shifts.length > 0 ? (
                      selectedEmployee.shifts.map((shift) => (
                        <TableRow key={shift.id}>
                          <TableCell>{format(shift.date, "dd/MM/yyyy")}</TableCell>
                          <TableCell>
                            {formatTimeValue(shift.startTime)} - {formatTimeValue(shift.endTime)}
                          </TableCell>
                          <TableCell>{formatLabel(shift.shiftType)}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={formatLabel(shift.status)}
                              color={getStatusChipColor(shift.status)}
                            />
                          </TableCell>
                          <TableCell align="right">{shift.netHours.toFixed(2)}</TableCell>
                          <TableCell align="right">{shift.breakHours.toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          No shifts in the selected range
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Typography variant="subtitle1" gutterBottom>
                Leave Breakdown
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Date Range</TableCell>
                      <TableCell align="right">Days In Range</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedEmployee.timeOffEntries.length > 0 ? (
                      selectedEmployee.timeOffEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>{formatLabel(entry.type)}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={formatLabel(entry.status)}
                              color={getStatusChipColor(entry.status)}
                            />
                          </TableCell>
                          <TableCell>
                            {format(entry.startDate, "dd/MM/yyyy")} - {format(entry.endDate, "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell align="right">{entry.overlapDays}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          No leave in the selected range
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedEmployeeId(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default SchedulingReport
