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
import { format, parseISO } from "date-fns"
import { 
  calculateDateRange, 
  filterByCompanyContext, 
  isDateInRange, 
  safeArray,
  safeString,
  safeParseDate
} from "../../../utils/reportHelpers"
import { exportReportContainerToCsv, exportReportContainerToPdf } from "../../../utils/reportExport"
import type { BookingsReportProps } from "./reportTypes"

type GroupByType = "none" | "site" | "area" | "day" | "daypart" | "bookingType"

const BookingsSummaryReport: React.FC<BookingsReportProps> = ({ headerControls }) => {
  const reportRef = useRef<HTMLDivElement | null>(null)
  const { bookings = [], tables = [], bookingSettings, bookingTypes = [], bookingStatuses = [], companyState } = useBookingsReportContext()
  const { sites = [] } = companyState

  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("week")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [customStartDate, setCustomStartDate] = useState<Date>(new Date(new Date().setDate(new Date().getDate() - 7)))
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date())
  const [groupBy, setGroupBy] = useState<GroupByType>("none")
  const [selectedSites, setSelectedSites] = useState<string[]>([])
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])
  const [selectedBookingTypes, setSelectedBookingTypes] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedDayparts, setSelectedDayparts] = useState<string[]>([])

  const { startDate, endDate } = useMemo(() => {
    return calculateDateRange(dateType, currentDate, customStartDate, customEndDate)
  }, [dateType, currentDate, customStartDate, customEndDate])

  // Helper function to determine daypart
  const getDaypart = (time: string) => {
    const hour = parseInt(time.split(":")[0])
    if (hour < 12) return "Breakfast"
    if (hour < 17) return "Lunch"
    if (hour < 22) return "Dinner"
    return "Late"
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
        
        const inDateRange = isDateInRange(booking.date, startDate, endDate)
        const matchesSite = selectedSites.length === 0 || selectedSites.includes(safeString(booking.siteId))
        const matchesArea = selectedAreas.length === 0 || selectedAreas.includes(safeString(booking.area))
        const matchesType = selectedBookingTypes.length === 0 || selectedBookingTypes.includes(safeString(booking.bookingType))
        const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(safeString(booking.status))
        
          const daypart = getDaypart(safeString(booking.arrivalTime || booking.startTime, "12:00"))
          const matchesDaypart = selectedDayparts.length === 0 || selectedDayparts.includes(daypart)
        
          return inDateRange && matchesSite && matchesArea && matchesType && matchesStatus && matchesDaypart
        })
    } catch (error) {
      console.error("Error filtering bookings:", error)
      return []
    }
  }, [bookings, startDate, endDate, selectedSites, selectedAreas, selectedBookingTypes, selectedStatuses, selectedDayparts, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const metrics = useMemo(() => {
    const totalBookings = filteredBookings.length
    const totalCovers = filteredBookings.reduce((sum: number, booking: any) => sum + (booking.guests || booking.covers || booking.guestCount || 0), 0)
    
    const walkIns = filteredBookings.filter((b: any) => b.source === "walk-in" || b.bookingType === "walk-in").length
    const cancellations = filteredBookings.filter((b: any) => b.status === "cancelled").length
    const noShows = filteredBookings.filter((b: any) => b.tracking === "No Show" || b.status === "no-show").length
    
    const totalBookingValue = filteredBookings.reduce((sum: number, booking: any) => sum + (booking.totalAmount || booking.deposit || 0), 0)
    const avgCoversPerBooking = totalBookings > 0 ? totalCovers / totalBookings : 0
    
    // Calculate capacity % from tables
    const venueCapacity = tables.reduce((sum: number, table: any) => sum + (table.capacity || 0), 0) || 100
    const capacityPercent = (totalCovers / venueCapacity) * 100

    const confirmedBookings = filteredBookings.filter((b: any) => b.status === "confirmed" || b.status === "completed").length
    const pendingBookings = filteredBookings.filter((b: any) => b.status === "pending" || b.status === "enquiry").length

    return {
      totalBookings,
      totalCovers,
      capacityPercent,
      walkIns,
      cancellations,
      noShows,
      totalBookingValue,
      avgCoversPerBooking,
      confirmedBookings,
      pendingBookings,
      venueCapacity,
    }
  }, [filteredBookings, bookingSettings, tables])

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
        case "day":
          const bookingDate = safeParseDate(booking.date)
          if (bookingDate) {
            key = format(bookingDate, "yyyy-MM-dd")
          } else {
            key = "Invalid Date"
          }
          break
        case "daypart":
          key = getDaypart(booking.arrivalTime || booking.startTime || "12:00")
          break
        case "bookingType":
          key = booking.bookingType || "Standard"
          break
      }

      if (!groups[key]) {
        groups[key] = {
          key,
          bookings: 0,
          covers: 0,
          walkIns: 0,
          cancellations: 0,
          noShows: 0,
          value: 0,
        }
      }

      groups[key].bookings += 1
      groups[key].covers += booking.guests || booking.covers || booking.guestCount || 0
      groups[key].value += booking.totalAmount || booking.deposit || 0
      
      if (booking.source === "walk-in" || booking.bookingType === "walk-in") groups[key].walkIns += 1
      if (booking.status === "cancelled") groups[key].cancellations += 1
      if (booking.tracking === "No Show" || booking.status === "no-show") groups[key].noShows += 1
    })

    return Object.values(groups).sort((a: any, b: any) => b.bookings - a.bookings)
  }, [filteredBookings, groupBy])

  const siteFilterOptions = useMemo(() => 
    sites.map((site: any) => ({ id: site.id, name: site.name })),
    [sites]
  )

  const areaOptions = useMemo(() => {
    const areas = new Set(bookings.map((b: any) => b.area).filter(Boolean))
    return Array.from(areas).map(area => ({ id: area as string, name: area as string }))
  }, [bookings])

  const bookingTypeOptions = useMemo(() => {
    // Use actual booking types from context, fallback to empty array
    if (bookingTypes.length > 0) {
      return bookingTypes.map((type) => ({
        id: type.name, // Use name as ID for matching
        name: type.name,
      }))
    }
    // Fallback to common types if context is not available
    return [
      { id: "standard", name: "Standard" },
      { id: "event", name: "Event" },
      { id: "private", name: "Private Hire" },
      { id: "walk-in", name: "Walk-in" },
    ]
  }, [bookingTypes])

  const statusOptions = useMemo(() => {
    // Use actual booking statuses from context, fallback to empty array
    if (bookingStatuses.length > 0) {
      return bookingStatuses.map((status) => ({
        id: status.name, // Use name as ID for matching
        name: status.name,
      }))
    }
    // Fallback to common statuses if context is not available
    return [
      { id: "confirmed", name: "Confirmed" },
      { id: "enquiry", name: "Enquiry" },
      { id: "pending", name: "Pending" },
      { id: "cancelled", name: "Cancelled" },
      { id: "completed", name: "Completed" },
      { id: "no-show", name: "No-show" },
    ]
  }, [bookingStatuses])

  const daypartOptions = useMemo(() => [
    { id: "Breakfast", name: "Breakfast" },
    { id: "Lunch", name: "Lunch" },
    { id: "Dinner", name: "Dinner" },
    { id: "Late", name: "Late" },
  ], [])

  const groupByOptions = useMemo(() => [
    { value: "none", label: "No Grouping" },
    { value: "site", label: "By Site" },
    { value: "area", label: "By Area" },
    { value: "day", label: "By Day" },
    { value: "daypart", label: "By Daypart" },
    { value: "bookingType", label: "By Booking Type" },
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
            label: "Booking Type",
            options: bookingTypeOptions,
            selectedValues: selectedBookingTypes,
            onSelectionChange: setSelectedBookingTypes,
          },
          {
            label: "Status",
            options: statusOptions,
            selectedValues: selectedStatuses,
            onSelectionChange: setSelectedStatuses,
          },
          {
            label: "Daypart",
            options: daypartOptions,
            selectedValues: selectedDayparts,
            onSelectionChange: setSelectedDayparts,
          },
        ]}
        groupByOptions={groupByOptions}
        groupByValue={groupBy}
        onGroupByChange={(value) => setGroupBy(value as GroupByType)}
        onExportCSV={() => exportReportContainerToCsv(reportRef.current, "bookings-summary-report.csv")}
        onExportPDF={() => exportReportContainerToPdf(reportRef.current, "Bookings Summary Report", "bookings-summary-report.pdf")}
      />

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Bookings</Typography>
              <Typography variant="h5">{metrics.totalBookings}</Typography>
              <Typography variant="caption" color="success.main">
                {metrics.confirmedBookings} Confirmed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Covers</Typography>
              <Typography variant="h5">{metrics.totalCovers}</Typography>
              <Typography variant="caption" color="text.secondary">
                Avg: {metrics.avgCoversPerBooking.toFixed(1)} per booking
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Capacity %</Typography>
              <Typography variant="h5" color={metrics.capacityPercent > 80 ? "success.main" : "warning.main"}>
                {metrics.capacityPercent.toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {metrics.totalCovers} / {metrics.venueCapacity} capacity
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Value</Typography>
              <Typography variant="h5">£{metrics.totalBookingValue.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Walk-ins</Typography>
              <Typography variant="h6">{metrics.walkIns}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Cancellations</Typography>
              <Typography variant="h6" color="error.main">{metrics.cancellations}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">No-shows</Typography>
              <Typography variant="h6" color="warning.main">{metrics.noShows}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Pending</Typography>
              <Typography variant="h6">{metrics.pendingBookings}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Avg Covers/Booking</Typography>
              <Typography variant="h6">{metrics.avgCoversPerBooking.toFixed(1)}</Typography>
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
                  <TableCell align="right">Bookings</TableCell>
                  <TableCell align="right">Covers</TableCell>
                  <TableCell align="right">Avg Covers</TableCell>
                  <TableCell align="right">Walk-ins</TableCell>
                  <TableCell align="right">Cancellations</TableCell>
                  <TableCell align="right">No-shows</TableCell>
                  <TableCell align="right">Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupedData.map((row: any) => {
                  // Format date keys to UK format (dd/MM/yyyy)
                  let displayKey = row.key
                  if (groupBy === "day") {
                    try {
                      const dateObj = parseISO(row.key)
                      if (!isNaN(dateObj.getTime())) {
                        displayKey = format(dateObj, "dd/MM/yyyy")
                      }
                    } catch {
                      // If parsing fails, use the original key
                    }
                  }
                  return (
                  <TableRow key={row.key}>
                    <TableCell>{displayKey}</TableCell>
                    <TableCell align="right"><strong>{row.bookings}</strong></TableCell>
                    <TableCell align="right">{row.covers}</TableCell>
                    <TableCell align="right">{(row.covers / row.bookings).toFixed(1)}</TableCell>
                    <TableCell align="right">{row.walkIns}</TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={row.cancellations} 
                        size="small" 
                        color={row.cancellations > 0 ? "error" : "default"}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={row.noShows} 
                        size="small" 
                        color={row.noShows > 0 ? "warning" : "default"}
                      />
                    </TableCell>
                    <TableCell align="right"><strong>£{row.value.toFixed(2)}</strong></TableCell>
                  </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  )
}

export default BookingsSummaryReport

