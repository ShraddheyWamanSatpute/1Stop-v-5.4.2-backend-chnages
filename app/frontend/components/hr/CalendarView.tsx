"use client"

import { alpha } from "@mui/material/styles";
import type React from "react"
import { format, parseISO, isValid, differenceInMinutes } from "date-fns"
import { Box, Typography, Paper, Grid, Card, CardContent, Chip, Divider, Tooltip } from "@mui/material"
import WbSunnyIcon from "@mui/icons-material/WbSunny"
import CloudIcon from "@mui/icons-material/Cloud"
import UmbrellaIcon from "@mui/icons-material/Umbrella"
import AcUnitIcon from "@mui/icons-material/AcUnit"
import FilterDramaIcon from "@mui/icons-material/FilterDrama"
import type { Schedule, Employee } from "../../../backend/interfaces/HRs"
import { themeConfig } from "../../../theme/AppTheme"

interface CalendarViewProps {
  currentWeekStart: Date
  currentWeekDays: Date[]
  filteredSchedules: Schedule[]
  groupedSchedules?: Record<string, Schedule[]>
  groupBy?: "none" | "department" | "role"
  handleWeekChange: (direction: "prev" | "next") => void
  handleEditSchedule: (schedule: Schedule) => void
  handleDeleteSchedule: (id: string) => void
  weatherData?: Record<string, any>
  employees: Employee[]
}

// Calendar component that displays schedules in a weekly grid format with weather and cost information
const CalendarView: React.FC<CalendarViewProps> = ({
  currentWeekDays,
  filteredSchedules,
  groupedSchedules,
  groupBy = "none",
  handleEditSchedule,
  weatherData,
  employees,
}) => {

  // Calculate daily cost for schedules on a specific day
  const calculateDailyCost = (daySchedules: Schedule[]) => {
    return daySchedules.reduce((total, schedule) => {
      // Fix field name mismatch: schedule data uses employeeID but we need employeeId
      const employeeId = schedule.employeeId || (schedule as any).employeeID
      
      // Find the employee for this schedule
      const employee = employees.find((emp) => emp.id === employeeId)
      if (!employee) return total

      // Parse start and end times properly using date-fns
      const startTime = parseISO(`2000-01-01T${schedule.startTime}:00`)
      const endTime = parseISO(`2000-01-01T${schedule.endTime}:00`)
      
      if (!isValid(startTime) || !isValid(endTime)) {
        return total
      }

      // Calculate total hours worked using date-fns for accuracy
      const totalHours = differenceInMinutes(endTime, startTime) / 60

      // Calculate cost based on employee pay type (schedules don't have payType/payRate in data)
      let cost = 0
      if (employee.payType === "hourly" && employee.hourlyRate) {
        cost = employee.hourlyRate * totalHours
      } else if (employee.payType === "salary" && employee.salary) {
        // For salary: cost per hour = (salary ÷ 52) ÷ hours per week (fallback to 40 if missing)
        const contractHours = employee.hoursPerWeek && employee.hoursPerWeek > 0 ? employee.hoursPerWeek : 40
        const hourlyRate = employee.salary / 52 / contractHours
        cost = hourlyRate * totalHours
      }

      // Add proportional tronc and bonus if available
      if (employee.tronc) {
        // Assuming tronc is monthly, calculate hourly proportion
        const workDaysPerMonth = 22 // Average work days in a month
        const workHoursPerDay = (employee.hoursPerWeek || 40) / 5 // Average work hours per day
        const troncPerHour = employee.tronc / (workDaysPerMonth * workHoursPerDay)
        cost += troncPerHour * totalHours
      }

      if (employee.bonus) {
        // Assuming bonus is monthly, calculate hourly proportion
        const workDaysPerMonth = 22 // Average work days in a month
        const workHoursPerDay = (employee.hoursPerWeek || 40) / 5 // Average work hours per day
        const bonusPerHour = employee.bonus / (workDaysPerMonth * workHoursPerDay)
        cost += bonusPerHour * totalHours
      }

      return total + cost
    }, 0)
  }

  // Weather icons are now handled directly with Material-UI components

  // Render a calendar grid with schedules, weather data, and cost information
  const renderCalendarGrid = (schedules: Schedule[], title?: string) => (
    <Box sx={{ mb: title ? 3 : 0 }}>
      {title && (
        <Paper
          sx={{
            p: 2,
            mb: 2,
            bgcolor: themeConfig.brandColors.navy,
            color: themeConfig.brandColors.offWhite,
            borderRadius: 1,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            {title} ({schedules.length} schedule{schedules.length !== 1 ? "s" : ""})
          </Typography>
        </Paper>
      )}

      {/* Calendar Grid */}
      <Grid container spacing={1}>
        {currentWeekDays.map((day) => {
          const formattedDate = format(day, "yyyy-MM-dd")
          const daySchedules = schedules.filter((schedule) => schedule.date === formattedDate)
          const dailyCost = calculateDailyCost(daySchedules)

          // Get weather data for this day if available
          const dayWeather = weatherData?.[formattedDate]

          return (
            <Grid
              item
              xs={12}
              md={1.7}
              key={day.toISOString()}
              role="gridcell"
              aria-label={format(day, "EEEE, MMMM d, yyyy")}
            >
              <Paper sx={{ p: 1, minHeight: 200 }}>
                {/* Day header with cost and weather */}
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 1 }}>
                  {/* Daily cost - prominently displayed at the top */}
                  <Box sx={{ height: "28px", display: "flex", alignItems: "center", justifyContent: "center", mb: 1 }}>
                    <Tooltip title="Estimated daily cost including base pay, tronc, and bonus">
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: "bold",
                          color: dailyCost > 0 ? themeConfig.brandColors.navy : "text.secondary",
                          bgcolor: "rgba(0, 0, 0, 0.04)",
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 1,
                          border: "1px solid",
                          borderColor: dailyCost > 0 ? "primary.light" : "divider",
                        }}
                      >
                        £{dailyCost > 0 ? dailyCost.toFixed(2) : "0.00"}
                      </Typography>
                    </Tooltip>
                  </Box>

                  {/* Day label */}
                  <Typography variant="subtitle2" sx={{ textAlign: "center", mb: 0.5 }}>
                    {format(day, "EEE")}
                    <br />
                    {format(day, "MMM d")}
                  </Typography>

                  {/* Weather icon - using Material-UI icons */}
                  <Box
                    sx={{ height: "32px", display: "flex", alignItems: "center", justifyContent: "center", mb: 0.5 }}
                  >
                    {dayWeather?.condition?.toLowerCase().includes("clear") ||
                    dayWeather?.condition?.toLowerCase().includes("sunny") ? (
                      <WbSunnyIcon sx={{ color: "warning.main", fontSize: 24 }} />
                    ) : dayWeather?.condition?.toLowerCase().includes("rain") ||
                      dayWeather?.condition?.toLowerCase().includes("shower") ? (
                      <UmbrellaIcon sx={{ color: themeConfig.brandColors.navy, fontSize: 24 }} />
                    ) : dayWeather?.condition?.toLowerCase().includes("snow") ? (
                      <AcUnitIcon sx={{ color: "info.light", fontSize: 24 }} />
                    ) : dayWeather?.condition?.toLowerCase().includes("partly") ? (
                      <FilterDramaIcon sx={{ color: "text.secondary", fontSize: 24 }} />
                    ) : (
                      <CloudIcon sx={{ color: "text.secondary", fontSize: 24 }} />
                    )}
                    <Typography variant="caption" sx={{ ml: 0.5 }}>
                      {dayWeather?.temperature ? Math.round(dayWeather.temperature) : "--"}°C
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 1 }} />

                {/* Schedule cards */}
                {daySchedules.map((schedule) => (
                  <Card 
                    key={schedule.id || (schedule as any).scheduleID} 
                    sx={{ 
                      mb: 0.5, 
                      fontSize: "0.75rem",
                      bgcolor: themeConfig.colors.primary.main,
                      color: 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        bgcolor: themeConfig.colors.primary.dark || '#1565c0',
                        transform: 'translateY(-1px)',
                        boxShadow: 2
                      }
                    }}
                    onClick={() => handleEditSchedule(schedule)}
                  >
                    <CardContent sx={{ p: 0.75, "&:last-child": { pb: 0.75 } }}>
                      <Typography variant="caption" display="block" sx={{ fontWeight: 'bold', color: 'white' }}>
                        {schedule.employeeName}
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ color: alpha(themeConfig.brandColors.offWhite, 0.9) }}>
                        {schedule.startTime} - {schedule.endTime}
                      </Typography>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 0.25 }}>
                        <Typography variant="caption" sx={{ color: alpha(themeConfig.brandColors.offWhite, 0.8), fontSize: '0.65rem' }}>
                          {schedule.role || ""}
                        </Typography>
                        <Chip
                          label={schedule.status}
                          size="small"
                          sx={{ 
                            fontSize: "0.6rem", 
                            height: 16,
                            bgcolor: alpha(themeConfig.brandColors.offWhite, 0.2),
                            color: 'white',
                            border: `1px solid ${alpha(themeConfig.brandColors.offWhite, 0.3)}`
                          }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                ))}

                {daySchedules.length === 0 && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ textAlign: "center", mt: 2 }}
                    aria-label={`No schedules for ${format(day, "EEEE, MMMM d")}`}
                  >
                    + Add
                  </Typography>
                )}
              </Paper>
            </Grid>
          )
        })}
      </Grid>
    </Box>
  )

  // If grouping is enabled, render grouped calendars
  if (groupBy !== "none" && groupedSchedules) {
    return (
      <Box>
        {Object.entries(groupedSchedules).map(([groupName, schedules]) => renderCalendarGrid(schedules, groupName))}
      </Box>
    )
  }

  // Default single calendar view
  return renderCalendarGrid(filteredSchedules)
}

export default CalendarView
