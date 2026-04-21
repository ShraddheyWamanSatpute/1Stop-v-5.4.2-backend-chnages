/**
 * ESS Schedule Page
 *
 * Shows employee's work schedule:
 * - Weekly calendar view with approved leave
 * - List of upcoming shifts and time off
 * - Shift details
 */

"use client"

import React, { useEffect, useMemo, useState } from "react"
import { eachDayOfInterval, endOfWeek, format, isValid, startOfWeek } from "date-fns"
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Chip,
  Divider,
  IconButton,
  useTheme,
} from "@mui/material"
import { alpha } from "@mui/material/styles"
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Event as EventIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material"
import { useESS } from "../../backend/context/MobileContext"
import { useHR } from "../../../app/backend/context/HRContext"
import { EmptyState } from "../components"

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

type ScheduleEntry = {
  id: string
  date: Date
  type: "shift" | "time_off"
  startLabel: string
  endLabel?: string
  role?: string
  source: any
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>{value === index && <Box>{children}</Box>}</div>
)

const ESSSchedule: React.FC = () => {
  const theme = useTheme()
  const { state, refreshData } = useESS()
  const { state: hrState, refreshSchedules } = useHR()
  const [tabValue, setTabValue] = useState(0)
  const [currentWeekDate, setCurrentWeekDate] = useState(new Date())

  const employee = state.currentEmployee

  useEffect(() => {
    if (!refreshSchedules) return
    if (!employee) return
    if (hrState?.schedules && hrState.schedules.length > 0) return
    refreshSchedules().catch(() => undefined)
  }, [refreshSchedules, employee, hrState?.schedules])

  useEffect(() => {
    refreshData?.().catch?.(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.employeeId, state.emulatedEmployeeId])

  const coerceDate = (dateValue: any): Date | null => {
    if (!dateValue) return null
    if (dateValue instanceof Date) return isValid(dateValue) ? dateValue : null
    if (typeof dateValue === "number" || typeof dateValue === "string") {
      const parsed = new Date(dateValue)
      return isValid(parsed) ? parsed : null
    }
    return null
  }

  const employeeShifts = useMemo(() => {
    const employeeId = state.emulatedEmployeeId || state.employeeId
    if (!employeeId) return []

    const all = (hrState.schedules || []) as any[]
    return all
      .filter((schedule) => {
        const scheduleEmployeeId =
          schedule.employeeId || schedule.employeeID || (schedule as any).employeeId
        return String(scheduleEmployeeId) === String(employeeId)
      })
      .filter((schedule) =>
        ["scheduled", "confirmed", "completed"].includes(String(schedule.status || "")),
      )
      .map((schedule) => {
        const parsedDate = coerceDate(schedule.date)
        return parsedDate ? { ...schedule, _parsedDate: parsedDate } : null
      })
      .filter(Boolean) as Array<any & { _parsedDate: Date }>
  }, [hrState.schedules, state.employeeId, state.emulatedEmployeeId])

  const approvedTimeOffEntries = useMemo<ScheduleEntry[]>(() => {
    const todayKey = format(new Date(), "yyyy-MM-dd")

    return (state.approvedTimeOff || []).flatMap((request: any, requestIndex: number) => {
      const startDate = coerceDate(request.startDate)
      const endDate = coerceDate(request.endDate)
      if (!startDate || !endDate) return []

      return eachDayOfInterval({ start: startDate, end: endDate })
        .filter((day) => format(day, "yyyy-MM-dd") >= todayKey)
        .map((day, dayIndex) => ({
          id: `${request.id || `timeoff-${requestIndex}`}-${format(day, "yyyy-MM-dd")}-${dayIndex}`,
          date: day,
          type: "time_off" as const,
          startLabel: "Time Off",
          endLabel: request.type ? String(request.type).replace(/_/g, " ") : "Approved leave",
          source: request,
        }))
    })
  }, [state.approvedTimeOff])

  const upcomingEntries = useMemo<ScheduleEntry[]>(() => {
    const todayKey = format(new Date(), "yyyy-MM-dd")

    const shiftEntries = employeeShifts
      .filter((shift) => format(shift._parsedDate, "yyyy-MM-dd") >= todayKey)
      .map((shift, index: number) => ({
        id: String(shift.id || `shift-${index}`),
        date: shift._parsedDate,
        type: "shift" as const,
        startLabel: shift.startTime || "Shift",
        endLabel: shift.endTime || "",
        role: shift.role,
        source: shift,
      }))

    return [...shiftEntries, ...approvedTimeOffEntries].sort((a, b) => {
      const dateCompare = a.date.getTime() - b.date.getTime()
      if (dateCompare !== 0) return dateCompare
      if (a.type === b.type) return 0
      return a.type === "time_off" ? -1 : 1
    })
  }, [approvedTimeOffEntries, employeeShifts])

  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentWeekDate, { weekStartsOn: 1 })
    const days = eachDayOfInterval({
      start: weekStart,
      end: endOfWeek(currentWeekDate, { weekStartsOn: 1 }),
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayIndex = days.findIndex((day) => {
      const dayCopy = new Date(day)
      dayCopy.setHours(0, 0, 0, 0)
      return dayCopy.getTime() === today.getTime()
    })

    if (todayIndex > 0) {
      return [...days.slice(todayIndex), ...days.slice(0, todayIndex)]
    }

    return days
  }, [currentWeekDate])

  const getEntriesForDate = (date: Date): ScheduleEntry[] => {
    const shiftEntries = employeeShifts
      .filter((shift) => format(shift._parsedDate, "yyyy-MM-dd") === format(date, "yyyy-MM-dd"))
      .map((shift, index: number) => ({
        id: String(shift.id || `week-shift-${index}`),
        date: shift._parsedDate,
        type: "shift" as const,
        startLabel: shift.startTime || "Shift",
        endLabel: shift.endTime || "",
        role: shift.role,
        source: shift,
      }))

    const timeOffEntries = approvedTimeOffEntries.filter(
      (entry) => format(entry.date, "yyyy-MM-dd") === format(date, "yyyy-MM-dd"),
    )

    return [...timeOffEntries, ...shiftEntries].sort((a, b) => {
      if (a.type !== b.type) return a.type === "time_off" ? -1 : 1
      return a.date.getTime() - b.date.getTime()
    })
  }

  const navigateWeek = (direction: "prev" | "next") => {
    setCurrentWeekDate((prev) => {
      const newDate = new Date(prev)
      newDate.setDate(prev.getDate() + (direction === "next" ? 7 : -7))
      return newDate
    })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const formatWeekRange = () => {
    const weekStart = startOfWeek(currentWeekDate, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(currentWeekDate, { weekStartsOn: 1 })

    if (weekStart.getMonth() === weekEnd.getMonth()) {
      return `${format(weekStart, "MMM d")} - ${format(weekEnd, "d, yyyy")}`
    }
    return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`
  }

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2 },
        pb: { xs: 12, sm: 4 },
        maxWidth: "100%",
        overflowX: "hidden",
      }}
    >
      <Tabs
        value={tabValue}
        onChange={(_, newValue) => setTabValue(newValue)}
        sx={{
          mb: { xs: 1.5, sm: 2 },
          bgcolor: "primary.main",
          borderRadius: 2,
          "& .MuiTab-root": {
            fontSize: { xs: "0.75rem", sm: "0.875rem" },
            minHeight: { xs: 48, sm: 48 },
            color: "primary.contrastText",
            opacity: 0.75,
            "&.Mui-selected": {
              color: "primary.contrastText",
              opacity: 1,
            },
          },
          "& .MuiTabs-indicator": {
            backgroundColor: "primary.contrastText",
          },
        }}
        variant="fullWidth"
      >
        <Tab label="Week" />
        <Tab label="List" />
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        {!employee ? (
          <EmptyState
            icon={<EventIcon sx={{ fontSize: 48 }} />}
            title="Employee not linked"
            description="We can't find your employee profile yet, so we can't show your rota."
          />
        ) : (
          <>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: { xs: 1.5, sm: 2 },
              }}
            >
              <IconButton
                onClick={() => navigateWeek("prev")}
                size="small"
                sx={{ minWidth: { xs: 44, sm: 40 }, minHeight: { xs: 44, sm: 40 } }}
              >
                <ChevronLeftIcon sx={{ fontSize: { xs: 24, sm: 20 } }} />
              </IconButton>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: "0.875rem", sm: "1rem" },
                  textAlign: "center",
                  flex: 1,
                }}
              >
                {formatWeekRange()}
              </Typography>
              <IconButton
                onClick={() => navigateWeek("next")}
                size="small"
                sx={{ minWidth: { xs: 44, sm: 40 }, minHeight: { xs: 44, sm: 40 } }}
              >
                <ChevronRightIcon sx={{ fontSize: { xs: 24, sm: 20 } }} />
              </IconButton>
            </Box>

            <Box
              ref={(element) => {
                if (!element) return

                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const todayCard = Array.from(element.children).find((child) => {
                  const dayAttr = (child as HTMLElement).getAttribute("data-day")
                  if (!dayAttr) return false
                  const dayDate = new Date(dayAttr)
                  dayDate.setHours(0, 0, 0, 0)
                  return dayDate.getTime() === today.getTime()
                })

                if (todayCard) {
                  todayCard.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                    inline: "start",
                  })
                }
              }}
              sx={{
                display: "flex",
                gap: { xs: 0.75, sm: 1 },
                mb: { xs: 1.5, sm: 2 },
                overflowX: "auto",
                pb: 1,
                WebkitOverflowScrolling: "touch",
                "&::-webkit-scrollbar": {
                  height: 4,
                },
              }}
            >
              {weekDays.map((day) => {
                const entries = getEntriesForDate(day)
                const hasEntry = entries.length > 0
                const primaryEntry = entries[0]
                const today = isToday(day)

                return (
                  <Card
                    key={day.toISOString()}
                    data-day={day.toISOString()}
                    sx={{
                      minWidth: { xs: 70, sm: 80 },
                      flex: "1 0 auto",
                      borderRadius: { xs: 1.5, sm: 2 },
                      border: today ? `2px solid ${theme.palette.primary.main}` : "none",
                      bgcolor: hasEntry
                        ? primaryEntry?.type === "time_off"
                          ? alpha(theme.palette.warning.main, 0.12)
                          : alpha(theme.palette.primary.main, 0.08)
                        : "background.paper",
                    }}
                  >
                    <CardContent
                      sx={{
                        p: { xs: 1, sm: 1.5 },
                        textAlign: "center",
                        "&:last-child": { pb: { xs: 1, sm: 1.5 } },
                      }}
                    >
                      <Typography
                        variant="caption"
                        color={today ? "primary" : "text.secondary"}
                        sx={{
                          fontWeight: today ? 600 : 400,
                          fontSize: { xs: "0.65rem", sm: "0.75rem" },
                        }}
                      >
                        {format(day, "EEE")}
                      </Typography>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          color: today ? "primary.main" : "text.primary",
                          fontSize: { xs: "1rem", sm: "1.25rem" },
                        }}
                      >
                        {day.getDate()}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: { xs: "0.6rem", sm: "0.7rem" }, lineHeight: 1 }}
                      >
                        {format(day, "MMM")}
                      </Typography>
                      {hasEntry && (
                        <Chip
                          label={
                            primaryEntry?.type === "time_off"
                              ? "Time Off"
                              : primaryEntry?.startLabel
                          }
                          size="small"
                          color={primaryEntry?.type === "time_off" ? "warning" : "primary"}
                          sx={{
                            mt: 0.5,
                            height: { xs: 18, sm: 20 },
                            fontSize: { xs: "0.6rem", sm: "0.65rem" },
                          }}
                        />
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </Box>

            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                  This Week's Schedule
                </Typography>
                {weekDays.some((day) => getEntriesForDate(day).length > 0) ? (
                  weekDays.map((day) => {
                    const entries = getEntriesForDate(day)
                    if (entries.length === 0) return null

                    return entries.map((entry, index) => (
                      <Box key={`${day.toISOString()}-${entry.id}-${index}`}>
                        <Box sx={{ display: "flex", gap: 1.5, py: 1.5 }}>
                          <Box sx={{ textAlign: "center", minWidth: 50, flexShrink: 0 }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontSize: "0.7rem" }}
                            >
                              {format(day, "EEE")}
                            </Typography>
                            <Typography
                              variant="h6"
                              sx={{ fontWeight: 600, lineHeight: 1, fontSize: "1rem" }}
                            >
                              {day.getDate()}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontSize: "0.65rem", lineHeight: 1 }}
                            >
                              {format(day, "MMM")}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              flex: 1,
                              minWidth: 0,
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Box sx={{ flex: 1 }}>
                              {entry.type === "time_off" ? (
                                <>
                                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                    Time Off
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ fontSize: "0.75rem", textTransform: "capitalize" }}
                                  >
                                    {entry.endLabel || "Approved leave"}
                                  </Typography>
                                </>
                              ) : (
                                <>
                                  <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                                    {entry.startLabel} - {entry.endLabel}
                                  </Typography>
                                  {entry.role && (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ fontSize: "0.75rem" }}
                                    >
                                      {entry.role}
                                    </Typography>
                                  )}
                                </>
                              )}
                            </Box>
                            {entry.type === "time_off" ? (
                              <Chip
                                label="Approved"
                                size="small"
                                color="warning"
                                sx={{ flexShrink: 0 }}
                              />
                            ) : (
                              entry.source.status === "completed" && (
                                <CheckCircleIcon
                                  sx={{
                                    fontSize: { xs: 20, sm: 24 },
                                    color: "success.main",
                                    flexShrink: 0,
                                  }}
                                />
                              )
                            )}
                          </Box>
                        </Box>
                        <Divider />
                      </Box>
                    ))
                  })
                ) : (
                  <Box sx={{ py: 3, textAlign: "center" }}>
                    <Typography variant="body2" color="text.secondary">
                      No shifts or approved time off this week
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {!employee ? (
          <EmptyState
            icon={<EventIcon sx={{ fontSize: 48 }} />}
            title="Employee not linked"
            description="We can't find your employee profile yet, so we can't show your rota."
          />
        ) : upcomingEntries.length > 0 ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {upcomingEntries.map((entry, index) => (
              <Card key={entry.id || index} sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Box sx={{ display: "flex", gap: 1.5, py: 0.5 }}>
                    <Box sx={{ textAlign: "center", minWidth: 50, flexShrink: 0 }}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: "0.7rem" }}
                      >
                        {format(entry.date, "EEE")}
                      </Typography>
                      <Typography
                        variant="h6"
                        sx={{ fontWeight: 600, lineHeight: 1, fontSize: "1rem" }}
                      >
                        {entry.date.getDate()}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: "0.65rem", lineHeight: 1 }}
                      >
                        {format(entry.date, "MMM")}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        {entry.type === "time_off" ? (
                          <>
                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                              Time Off
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontSize: "0.75rem", textTransform: "capitalize" }}
                            >
                              {entry.endLabel || "Approved leave"}
                            </Typography>
                          </>
                        ) : (
                          <>
                            <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                              {entry.startLabel} - {entry.endLabel}
                            </Typography>
                            {entry.role && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontSize: "0.75rem" }}
                              >
                                {entry.role}
                              </Typography>
                            )}
                          </>
                        )}
                      </Box>
                      {entry.type === "time_off" ? (
                        <Chip label="Approved" size="small" color="warning" sx={{ flexShrink: 0 }} />
                      ) : (
                        entry.source.status === "completed" && (
                          <CheckCircleIcon
                            sx={{
                              fontSize: { xs: 20, sm: 24 },
                              color: "success.main",
                              flexShrink: 0,
                            }}
                          />
                        )
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : (
          <EmptyState
            icon={<EventIcon sx={{ fontSize: 48 }} />}
            title="No Upcoming Schedule"
            description="You don't have any shifts or approved time off showing yet. Check back later or contact your manager."
          />
        )}
      </TabPanel>
    </Box>
  )
}

export default ESSSchedule
