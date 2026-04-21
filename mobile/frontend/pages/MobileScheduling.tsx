"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { addDays, eachDayOfInterval, format, subDays } from "date-fns"
import {
  Box,
  ButtonBase,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material"
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Event as EventIcon,
  Group as GroupIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material"
import { useHR } from "../../../app/backend/context/HRContext"
import { useCompany } from "../../../app/backend/context/CompanyContext"
import { EmptyState } from "../components"

type GroupByOption = "none" | "role" | "department"
type FilterOption = "all" | "role" | "department"

type ScheduleRow = {
  id: string
  employeeId: string
  employeeName: string
  date: string
  label: string
  sublabel: string
  status: string
  isTimeOff: boolean
  role: string
  department: string
}

const normalizeDateKey = (value: unknown): string | null => {
  if (!value) return null
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10)
  }

  const parsed =
    value instanceof Date
      ? value
      : typeof value === "number"
        ? new Date(value)
        : new Date(String(value))

  if (Number.isNaN(parsed.getTime())) return null
  return format(parsed, "yyyy-MM-dd")
}

const MobileScheduling: React.FC = () => {
  const {
    state: hrState,
    refreshEmployees,
    refreshRoles,
    refreshDepartments,
    refreshSchedules,
    refreshTimeOffs,
  } = useHR()
  const { hasPermission } = useCompany()

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [groupBy, setGroupBy] = useState<GroupByOption>("role")
  const dateInputRef = useRef<HTMLInputElement | null>(null)
  const [filterBy, setFilterBy] = useState<FilterOption>("all")
  const [selectedFilterValue, setSelectedFilterValue] = useState<string>("all")

  const canViewScheduling = hasPermission("mobile", "teamSchedule", "view")
  const selectedDateKey = format(selectedDate, "yyyy-MM-dd")

  useEffect(() => {
    if (!canViewScheduling) return

    refreshEmployees?.(true).catch(() => undefined)
    refreshRoles?.(true).catch(() => undefined)
    refreshDepartments?.(true).catch(() => undefined)
    refreshSchedules?.().catch(() => undefined)
    refreshTimeOffs?.(true).catch(() => undefined)
  }, [
    canViewScheduling,
    refreshDepartments,
    refreshEmployees,
    refreshRoles,
    refreshSchedules,
    refreshTimeOffs,
  ])

  useEffect(() => {
    setSelectedFilterValue("all")
  }, [filterBy])

  const activeEmployees = useMemo(() => {
    return (hrState.employees || []).filter(
      (employee: any) =>
        employee.status !== "terminated" && employee.doNotIncludeOnRota !== true,
    )
  }, [hrState.employees])

  const roleMap = useMemo(() => {
    const map = new Map<string, string>()
    ;(hrState.roles || []).forEach((role: any) => {
      const label = role.label || role.name || "Unassigned"
      map.set(String(role.id), label)
    })
    return map
  }, [hrState.roles])

  const departmentMap = useMemo(() => {
    const map = new Map<string, string>()
    ;(hrState.departments || []).forEach((department: any) => {
      map.set(String(department.id), department.name || "Unassigned")
    })
    return map
  }, [hrState.departments])

  const employeeMap = useMemo(() => {
    const map = new Map<string, any>()
    activeEmployees.forEach((employee: any) => {
      map.set(String(employee.id), employee)
      if (employee.employeeID) map.set(String(employee.employeeID), employee)
    })
    return map
  }, [activeEmployees])

  const getEmployeeRole = (employee: any) => {
    const roleId = employee?.roleId || employee?.roleID
    return roleMap.get(String(roleId || "")) || employee?.role || "Unassigned"
  }

  const getEmployeeDepartment = (employee: any) => {
    const departmentId = employee?.departmentID || employee?.departmentId
    return (
      departmentMap.get(String(departmentId || "")) ||
      employee?.department ||
      "Unassigned"
    )
  }

  const dayRows = useMemo<ScheduleRow[]>(() => {
    const shifts = (hrState.schedules || [])
      .filter((schedule: any) => {
        const employee = employeeMap.get(
          String(schedule.employeeId || schedule.employeeID || ""),
        )
        if (!employee) return false
        if (normalizeDateKey(schedule.date) !== selectedDateKey) return false
        return schedule.status !== "cancelled"
      })
      .map((schedule: any) => {
        const employee = employeeMap.get(
          String(schedule.employeeId || schedule.employeeID || ""),
        )
        const employeeName =
          schedule.employeeName ||
          `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim() ||
          "Unknown Employee"
        const role = getEmployeeRole(employee)
        const department = getEmployeeDepartment(employee)

        return {
          id: String(schedule.id),
          employeeId: String(schedule.employeeId || schedule.employeeID),
          employeeName,
          date: normalizeDateKey(schedule.date) || selectedDateKey,
          label: `${schedule.startTime || "--:--"} - ${schedule.endTime || "--:--"}`,
          sublabel:
            schedule.role || role || schedule.department || department || "Shift",
          status: schedule.status || "scheduled",
          isTimeOff: false,
          role,
          department,
        }
      })

    const timeOff = ((hrState as any).timeOffs || [])
      .filter((request: any) => request?.status === "approved")
      .flatMap((request: any, requestIndex: number) => {
        const employee = employeeMap.get(
          String(request.employeeId || request.employeeID || ""),
        )
        if (!employee) return []

        return eachDayOfInterval({
          start: new Date(request.startDate),
          end: new Date(request.endDate),
        })
          .map((day, dayIndex) => {
            const dayKey = format(day, "yyyy-MM-dd")
            if (dayKey !== selectedDateKey) return null

            return {
              id: `timeoff-${request.id || requestIndex}-${dayKey}-${dayIndex}`,
              employeeId: String(employee.id),
              employeeName:
                `${employee.firstName || ""} ${employee.lastName || ""}`.trim() ||
                "Unknown Employee",
              date: dayKey,
              label: "Time Off",
              sublabel: String(request.type || "approved leave").replace(/_/g, " "),
              status: "approved",
              isTimeOff: true,
              role: getEmployeeRole(employee),
              department: getEmployeeDepartment(employee),
            }
          })
          .filter(Boolean) as ScheduleRow[]
      })

    return [...timeOff, ...shifts].sort((a, b) => {
      if (a.isTimeOff !== b.isTimeOff) return a.isTimeOff ? -1 : 1
      return a.employeeName.localeCompare(b.employeeName)
    })
  }, [departmentMap, employeeMap, hrState, roleMap, selectedDateKey])

  const filterOptions = useMemo(() => {
    if (filterBy === "role") {
      return Array.from(
        new Set(dayRows.map((row) => row.role).filter(Boolean)),
      ).sort()
    }

    if (filterBy === "department") {
      return Array.from(
        new Set(dayRows.map((row) => row.department).filter(Boolean)),
      ).sort()
    }

    return [] as string[]
  }, [dayRows, filterBy])

  const filteredRows = useMemo(() => {
    if (filterBy === "all" || selectedFilterValue === "all") {
      return dayRows
    }

    return dayRows.filter((row) => {
      if (filterBy === "role") return row.role === selectedFilterValue
      if (filterBy === "department") return row.department === selectedFilterValue
      return true
    })
  }, [dayRows, filterBy, selectedFilterValue])

  const groupedRows = useMemo(() => {
    if (groupBy === "none") {
      return [{ groupName: "", rows: filteredRows }]
    }

    const groups = new Map<string, ScheduleRow[]>()

    filteredRows.forEach((row) => {
      const key =
        groupBy === "department"
          ? row.department || "Unassigned"
          : row.role || "Unassigned"
      const existing = groups.get(key) || []
      existing.push(row)
      groups.set(key, existing)
    })

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([groupName, rows]) => ({ groupName, rows }))
  }, [filteredRows, groupBy])

  if (!canViewScheduling) {
    return (
      <Box sx={{ p: 2, pb: 12 }}>
        <EmptyState
          icon={<GroupIcon sx={{ fontSize: 48 }} />}
          title="Scheduling Not Enabled"
          description="Team schedule on mobile is controlled in Company → Permissions → Mobile. Ask your admin to enable “Home: Team schedule”."
        />
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2 }, pb: { xs: 12, sm: 4 } }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <IconButton onClick={() => setSelectedDate((current) => subDays(current, 1))}>
          <ChevronLeftIcon />
        </IconButton>
        <Box sx={{ textAlign: "center" }}>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, fontSize: { xs: "1rem", sm: "1.25rem" } }}
          >
            Team Schedule
          </Typography>
          <ButtonBase
            onClick={() => {
              const input = dateInputRef.current as
                | (HTMLInputElement & { showPicker?: () => void })
                | null
              input?.showPicker?.()
              input?.click()
            }}
            sx={{ borderRadius: 2, px: 1.5, py: 0.5 }}
          >
            <Typography variant="body2" color="text.secondary">
              {format(selectedDate, "EEEE, d MMM yyyy")}
            </Typography>
          </ButtonBase>
          <Box
            component="input"
            ref={dateInputRef}
            type="date"
            value={format(selectedDate, "yyyy-MM-dd")}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              if (!event.target.value) return
              setSelectedDate(new Date(`${event.target.value}T12:00:00`))
            }}
            sx={{
              position: "absolute",
              opacity: 0,
              pointerEvents: "none",
              width: 1,
              height: 1,
            }}
          />
        </Box>
        <IconButton onClick={() => setSelectedDate((current) => addDays(current, 1))}>
          <ChevronRightIcon />
        </IconButton>
      </Stack>

      <Stack spacing={1.5} sx={{ mb: 2 }}>
        <FormControl fullWidth size="small">
          <InputLabel id="mobile-schedule-group-by-label">Group By</InputLabel>
          <Select
            labelId="mobile-schedule-group-by-label"
            value={groupBy}
            label="Group By"
            onChange={(event) => setGroupBy(event.target.value as GroupByOption)}
          >
            <MenuItem value="none">None</MenuItem>
            <MenuItem value="role">Role</MenuItem>
            <MenuItem value="department">Department</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel id="mobile-schedule-filter-by-label">Filter By</InputLabel>
          <Select
            labelId="mobile-schedule-filter-by-label"
            value={filterBy}
            label="Filter By"
            onChange={(event) => setFilterBy(event.target.value as FilterOption)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="role">Role</MenuItem>
            <MenuItem value="department">Department</MenuItem>
          </Select>
        </FormControl>

        {filterBy !== "all" && (
          <FormControl fullWidth size="small">
            <InputLabel id="mobile-schedule-filter-value-label">Value</InputLabel>
            <Select
              labelId="mobile-schedule-filter-value-label"
              value={selectedFilterValue}
              label="Value"
              onChange={(event) => setSelectedFilterValue(event.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              {filterOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Stack>

      {groupedRows.length > 0 ? (
        <Stack spacing={1.5}>
          {groupedRows.map(({ groupName, rows }, index) => (
            <Box key={groupName || `all-${index}`}>
              {groupBy !== "none" && (
                <Box
                  sx={{
                    px: 0.5,
                    py: 0.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {groupName || "Unassigned"}
                  </Typography>
                </Box>
              )}

              <Stack spacing={0.75}>
                {rows.map((row) => (
                  <Box
                    key={row.id}
                    sx={{
                      p: 1.25,
                      borderRadius: 2,
                      bgcolor: row.isTimeOff
                        ? "rgba(25,118,210,0.08)"
                        : "rgba(255,152,0,0.08)",
                      border: "1px solid",
                      borderColor: row.isTimeOff
                        ? "rgba(25,118,210,0.25)"
                        : "rgba(255,152,0,0.25)",
                    }}
                  >
                    <Stack spacing={0.25}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={0.75}
                        sx={{ minWidth: 0 }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            lineHeight: 1.2,
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          {row.employeeName}
                        </Typography>
                        <Chip
                          icon={row.isTimeOff ? <EventIcon /> : <ScheduleIcon />}
                          label={row.isTimeOff ? "Approved" : row.status}
                          size="small"
                          color={
                            row.isTimeOff
                              ? "info"
                              : row.status === "draft"
                                ? "default"
                                : "warning"
                          }
                          sx={{ textTransform: "capitalize", height: 24 }}
                        />
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, lineHeight: 1.2, whiteSpace: "nowrap" }}
                        >
                          {row.label}
                        </Typography>
                      </Stack>
                      {groupBy === "none" && !row.isTimeOff && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block", lineHeight: 1.2 }}
                        >
                          {row.department}, {row.role}
                        </Typography>
                      )}
                      {row.isTimeOff && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: "block",
                            textTransform: "capitalize",
                            lineHeight: 1.2,
                          }}
                        >
                          {row.sublabel}
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      ) : (
        <Box sx={{ py: 6 }}>
          <EmptyState
            icon={<ScheduleIcon sx={{ fontSize: 44 }} />}
            title="No schedule items"
            description="There are no shifts or approved time off entries for the selected day and filters."
          />
        </Box>
      )}
    </Box>
  )
}

export default MobileScheduling
