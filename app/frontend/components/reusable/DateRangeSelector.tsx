"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Box, FormControl, InputLabel, MenuItem, Select, Button, Grid, Paper } from "@mui/material"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { format, subDays, startOfWeek, startOfMonth, startOfYear } from "date-fns"

interface DateRangeSelectorProps {
  onDateRangeChange: (startDate: Date, endDate: Date, frequency: string) => void
}

const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({ onDateRangeChange }) => {
  const [frequency, setFrequency] = useState<string>("daily")
  const [range, setRange] = useState<string>("today")
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [showDatePickers, setShowDatePickers] = useState<boolean>(false)

  useEffect(() => {
    if (range !== "custom") {
      handleRangeChange(range)
    } else if (startDate && endDate) {
      onDateRangeChange(startDate, endDate, frequency)
    }
  }, [frequency])

  useEffect(() => {
    handleRangeChange(range)
  }, [range])

  const handleFrequencyChange = (event: any) => {
    setFrequency(event.target.value)
  }

  const handleRangeChange = (newRange: string) => {
    setRange(newRange)
    setShowDatePickers(newRange === "custom")

    if (newRange !== "custom") {
      const today = new Date()
      let start = new Date()
      let end = new Date()

      switch (newRange) {
        case "today":
          start = new Date(today)
          end = new Date(today)
          break
        case "yesterday":
          start = subDays(today, 1)
          end = subDays(today, 1)
          break
        case "last7days":
          start = subDays(today, 6)
          end = today
          break
        case "thisWeek":
          start = startOfWeek(today, { weekStartsOn: 1 })
          end = today
          break
        case "lastWeek":
          const lastWeekEnd = subDays(startOfWeek(today, { weekStartsOn: 1 }), 1)
          start = startOfWeek(lastWeekEnd, { weekStartsOn: 1 })
          end = lastWeekEnd
          break
        case "thisMonth":
          start = startOfMonth(today)
          end = today
          break
        case "lastMonth":
          const lastMonthEnd = subDays(startOfMonth(today), 1)
          start = startOfMonth(lastMonthEnd)
          end = lastMonthEnd
          break
        case "thisYear":
          start = startOfYear(today)
          end = today
          break
        case "lastYear":
          const lastYearEnd = subDays(startOfYear(today), 1)
          start = startOfYear(lastYearEnd)
          end = lastYearEnd
          break
        default:
          break
      }

      setStartDate(start)
      setEndDate(end)
      onDateRangeChange(start, end, frequency)
    }
  }

  const handleCustomDateChange = () => {
    if (startDate && endDate) {
      onDateRangeChange(startDate, endDate, frequency)
    }
  }

  return (
    <Paper elevation={0} sx={{ p: 2, mb: 2 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth size="small">
            <InputLabel>Frequency</InputLabel>
            <Select value={frequency} label="Frequency" onChange={handleFrequencyChange}>
              <MenuItem value="hourly">Hourly</MenuItem>
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth size="small">
            <InputLabel>Range</InputLabel>
            <Select value={range} label="Range" onChange={(e) => handleRangeChange(e.target.value)}>
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="yesterday">Yesterday</MenuItem>
              <MenuItem value="last7days">Last 7 Days</MenuItem>
              <MenuItem value="thisWeek">This Week</MenuItem>
              <MenuItem value="lastWeek">Last Week</MenuItem>
              <MenuItem value="thisMonth">This Month</MenuItem>
              <MenuItem value="lastMonth">Last Month</MenuItem>
              <MenuItem value="thisYear">This Year</MenuItem>
              <MenuItem value="lastYear">Last Year</MenuItem>
              <MenuItem value="custom">Custom Range</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Box sx={{ fontWeight: "medium", color: "text.secondary" }}>
            {format(startDate, "MMM d, yyyy")} - {format(endDate, "MMM d, yyyy")}
          </Box>
        </Grid>

        {showDatePickers && (
          <Grid container item xs={12} spacing={2} sx={{ mt: 1 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Grid item xs={12} sm={5}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={(newValue) => {
                    if (newValue) {
                      setStartDate(newValue)
                    }
                  }}
                  slotProps={{ textField: { size: "small", fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} sm={5}>
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={(newValue) => {
                    if (newValue) {
                      setEndDate(newValue)
                    }
                  }}
                  slotProps={{ textField: { size: "small", fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleCustomDateChange}
                  fullWidth
                  sx={{ height: "40px" }}
                >
                  Apply
                </Button>
              </Grid>
            </LocalizationProvider>
          </Grid>
        )}
      </Grid>
    </Paper>
  )
}

export default DateRangeSelector
