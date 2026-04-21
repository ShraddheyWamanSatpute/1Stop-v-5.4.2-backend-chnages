"use client"

import React, { useState, useMemo, useRef } from "react"
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
import { useBookingsReportContext } from "../../../../backend/context/AnalyticsContext"
import DataHeader from "../../reusable/DataHeader"
import { format, parseISO, differenceInMinutes } from "date-fns"
import { 
  calculateDateRange, 
  filterByCompanyContext, 
  isDateInRange, 
  safeArray,
  safeString 
} from "../../../utils/reportHelpers"
import { exportReportContainerToCsv, exportReportContainerToPdf } from "../../../utils/reportExport"
import type { BookingsReportProps } from "./reportTypes"

type GroupByType = "none" | "site" | "area" | "timeSlot" | "employee"

const WalkInLiveBookingsReport: React.FC<BookingsReportProps> = ({ headerControls }) => {
  const reportRef = useRef<HTMLDivElement | null>(null)
  const { bookings = [], tables = [], companyState } = useBookingsReportContext()
  const { sites = [] } = companyState

  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("day")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [customStartDate, setCustomStartDate] = useState<Date>(new Date())
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date())
  const [groupBy, setGroupBy] = useState<GroupByType>("none")
  const [selectedSites, setSelectedSites] = useState<string[]>([])
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])

  const { startDate, endDate } = useMemo(() => {
    return calculateDateRange(dateType, currentDate, customStartDate, customEndDate)
  }, [dateType, currentDate, customStartDate, customEndDate])

  // Helper function to determine time slot
  const getTimeSlot = (time: string) => {
    const hour = parseInt(time.split(":")[0])
    if (hour < 12) return "Morning"
    if (hour < 17) return "Afternoon"
    return "Evening"
  }

  const filteredBookings = useMemo(() => {
    try {
      // Filter bookings by company context first
      const contextFilteredBookings = filterByCompanyContext(
        safeArray(bookings),
        companyState.selectedSiteID,
        companyState.selectedSubsiteID
      )
      
      return contextFilteredBookings.filter((booking: any) => {
        if (!booking.date) return false
        
        // Focus on walk-ins and same-day bookings
        const isWalkIn = safeString(booking.source) === "walk-in" || safeString(booking.bookingType) === "walk-in"
        const bookingDate = parseISO(booking.date)
        const createdDate = booking.createdAt ? parseISO(booking.createdAt) : bookingDate
        const isSameDay = format(bookingDate, "yyyy-MM-dd") === format(createdDate, "yyyy-MM-dd")
        
        if (!isWalkIn && !isSameDay) return false
        
        const inDateRange = isDateInRange(booking.date, startDate, endDate)
        const matchesSite = selectedSites.length === 0 || selectedSites.includes(safeString(booking.siteId))
        const matchesArea = selectedAreas.length === 0 || selectedAreas.includes(safeString(booking.area))
      
          const timeSlot = getTimeSlot(safeString(booking.arrivalTime || booking.startTime, "12:00"))
          const matchesTimeSlot = selectedTimeSlots.length === 0 || selectedTimeSlots.includes(timeSlot)
          
          const matchesEmployee = selectedEmployees.length === 0 || selectedEmployees.includes(safeString(booking.seatedBy || booking.createdBy))
          
          return inDateRange && matchesSite && matchesArea && matchesTimeSlot && matchesEmployee
        })
    } catch (error) {
      console.error("Error filtering walk-in bookings:", error)
      return []
    }
  }, [bookings, startDate, endDate, selectedSites, selectedAreas, selectedTimeSlots, selectedEmployees, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const metrics = useMemo(() => {
    const totalWalkIns = filteredBookings.length
    const totalGuests = filteredBookings.reduce((sum: number, booking: any) => sum + (booking.guests || booking.covers || booking.guestCount || 0), 0)
    const avgPartySize = totalWalkIns > 0 ? totalGuests / totalWalkIns : 0
    
    // Calculate wait times
    const waitTimes = filteredBookings
      .filter((b: any) => b.waitTime !== undefined)
      .map((b: any) => b.waitTime || 0)
    const avgWaitTime = waitTimes.length > 0 ? waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length : 0
    
    // Calculate dwell times (time from seated to left)
    const dwellTimes = filteredBookings
      .filter((b: any) => b.startTime && b.endTime)
      .map((b: any) => {
        try {
          const start = parseISO(`${b.date}T${b.startTime}`)
          const end = parseISO(`${b.date}T${b.endTime}`)
          return differenceInMinutes(end, start)
        } catch {
          return 0
        }
      })
    const avgDwellTime = dwellTimes.length > 0 ? dwellTimes.reduce((sum, time) => sum + time, 0) / dwellTimes.length : 0
    
    // Calculate table utilization
    const usedTables = new Set(filteredBookings.map((b: any) => b.tableId).filter(Boolean)).size
    const totalTables = tables.length
    const tableUtilization = totalTables > 0 ? (usedTables / totalTables) * 100 : 0
    
    // Calculate spend (if POS integration available)
    const walkInSpend = filteredBookings.reduce((sum: number, booking: any) => sum + (booking.totalAmount || 0), 0)
    const avgSpendPerGuest = totalGuests > 0 ? walkInSpend / totalGuests : 0

    return {
      totalWalkIns,
      totalGuests,
      avgPartySize,
      avgWaitTime,
      avgDwellTime,
      usedTables,
      totalTables,
      tableUtilization,
      walkInSpend,
      avgSpendPerGuest,
    }
  }, [filteredBookings, tables])

  const groupedData = useMemo(() => {
    if (groupBy === "none") return []

    const groups: Record<string, any> = {}

    filteredBookings.forEach((booking: any) => {
      let key = ""
      
      switch (groupBy) {
        case "site":
          key = booking.siteId || "Unknown"
          break
        case "area":
          key = booking.area || "Unknown"
          break
        case "timeSlot":
          key = getTimeSlot(booking.arrivalTime || booking.startTime || "12:00")
          break
        case "employee":
          key = booking.seatedBy || booking.createdBy || "Unknown"
          break
      }

      if (!groups[key]) {
        groups[key] = {
          key,
          walkIns: 0,
          guests: 0,
          waitTimes: [],
          dwellTimes: [],
          spend: 0,
        }
      }

      groups[key].walkIns += 1
      groups[key].guests += booking.guests || booking.covers || booking.guestCount || 0
      
      if (booking.waitTime !== undefined) {
        groups[key].waitTimes.push(booking.waitTime)
      }
      
      if (booking.startTime && booking.endTime) {
        try {
          const start = parseISO(`${booking.date}T${booking.startTime}`)
          const end = parseISO(`${booking.date}T${booking.endTime}`)
          groups[key].dwellTimes.push(differenceInMinutes(end, start))
        } catch {
          // ignore invalid dates
        }
      }
      
      groups[key].spend += booking.totalAmount || 0
    })

    return Object.values(groups).map((group: any) => ({
      ...group,
      avgPartySize: group.walkIns > 0 ? group.guests / group.walkIns : 0,
      avgWaitTime: group.waitTimes.length > 0 ? group.waitTimes.reduce((sum: number, time: number) => sum + time, 0) / group.waitTimes.length : 0,
      avgDwellTime: group.dwellTimes.length > 0 ? group.dwellTimes.reduce((sum: number, time: number) => sum + time, 0) / group.dwellTimes.length : 0,
      avgSpend: group.guests > 0 ? group.spend / group.guests : 0,
    })).sort((a: any, b: any) => b.walkIns - a.walkIns)
  }, [filteredBookings, groupBy])

  const siteFilterOptions = useMemo(() => 
    sites.map((site: any) => ({ id: site.id, name: site.name })),
    [sites]
  )

  const areaOptions = useMemo(() => {
    const areas = new Set(bookings.map((b: any) => b.area).filter(Boolean))
    return Array.from(areas).map(area => ({ id: area as string, name: area as string }))
  }, [bookings])

  const timeSlotOptions = useMemo(() => [
    { id: "Morning", name: "Morning" },
    { id: "Afternoon", name: "Afternoon" },
    { id: "Evening", name: "Evening" },
  ], [])

  const employeeOptions = useMemo(() => {
    const employees = new Set(bookings.map((b: any) => b.seatedBy || b.createdBy).filter(Boolean))
    return Array.from(employees).map(emp => ({ id: emp as string, name: emp as string }))
  }, [bookings])

  const groupByOptions = useMemo(() => [
    { value: "none", label: "No Grouping" },
    { value: "site", label: "By Site" },
    { value: "area", label: "By Area" },
    { value: "timeSlot", label: "By Time Slot" },
    { value: "employee", label: "By Employee" },
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
            label: "Site",
            options: siteFilterOptions,
            selectedValues: selectedSites,
            onSelectionChange: setSelectedSites,
          },
          {
            label: "Area",
            options: areaOptions,
            selectedValues: selectedAreas,
            onSelectionChange: setSelectedAreas,
          },
          {
            label: "Time Slot",
            options: timeSlotOptions,
            selectedValues: selectedTimeSlots,
            onSelectionChange: setSelectedTimeSlots,
          },
          {
            label: "Employee",
            options: employeeOptions,
            selectedValues: selectedEmployees,
            onSelectionChange: setSelectedEmployees,
          },
        ]}
        groupByOptions={groupByOptions}
        groupByValue={groupBy}
        onGroupByChange={(value) => setGroupBy(value as GroupByType)}
        onExportCSV={() => exportReportContainerToCsv(reportRef.current, "walk-in-live-bookings-report.csv")}
        onExportPDF={() => exportReportContainerToPdf(reportRef.current, "Walk-in and Live Bookings Report", "walk-in-live-bookings-report.pdf")}
      />

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Walk-ins</Typography>
              <Typography variant="h5">{metrics.totalWalkIns}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Guests</Typography>
              <Typography variant="h5">{metrics.totalGuests}</Typography>
              <Typography variant="caption" color="text.secondary">
                Avg: {metrics.avgPartySize.toFixed(1)} per party
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Avg Wait Time</Typography>
              <Typography variant="h5">{metrics.avgWaitTime.toFixed(0)} min</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Avg Dwell Time</Typography>
              <Typography variant="h5">{metrics.avgDwellTime.toFixed(0)} min</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Table Utilization</Typography>
              <Typography variant="h6">{metrics.tableUtilization.toFixed(1)}%</Typography>
              <Typography variant="caption" color="text.secondary">
                {metrics.usedTables} / {metrics.totalTables} tables used
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Walk-in Spend</Typography>
              <Typography variant="h6">£{metrics.walkInSpend.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Avg Spend/Guest</Typography>
              <Typography variant="h6">£{metrics.avgSpendPerGuest.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
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
                  <TableCell align="right">Walk-ins</TableCell>
                  <TableCell align="right">Guests</TableCell>
                  <TableCell align="right">Avg Party Size</TableCell>
                  <TableCell align="right">Avg Wait Time</TableCell>
                  <TableCell align="right">Avg Dwell Time</TableCell>
                  <TableCell align="right">Total Spend</TableCell>
                  <TableCell align="right">Avg Spend/Guest</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupedData.map((row: any) => (
                  <TableRow key={row.key}>
                    <TableCell>{row.key}</TableCell>
                    <TableCell align="right"><strong>{row.walkIns}</strong></TableCell>
                    <TableCell align="right">{row.guests}</TableCell>
                    <TableCell align="right">{row.avgPartySize.toFixed(1)}</TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={`${row.avgWaitTime.toFixed(0)} min`}
                        size="small" 
                        color={row.avgWaitTime > 30 ? "error" : row.avgWaitTime > 15 ? "warning" : "success"}
                      />
                    </TableCell>
                    <TableCell align="right">{row.avgDwellTime.toFixed(0)} min</TableCell>
                    <TableCell align="right"><strong>£{row.spend.toFixed(2)}</strong></TableCell>
                    <TableCell align="right">£{row.avgSpend.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  )
}

export default WalkInLiveBookingsReport

