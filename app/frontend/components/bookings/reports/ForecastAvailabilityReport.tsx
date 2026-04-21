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
  LinearProgress,
} from "@mui/material"
import { useBookingsReportContext } from "../../../../backend/context/AnalyticsContext"
import DataHeader from "../../reusable/DataHeader"
import { format, parseISO, addDays } from "date-fns"
import { 
  calculateDateRange, 
  filterByCompanyContext, 
  isDateInRange, 
  safeArray,
  safeString,
  safeNumber
} from "../../../utils/reportHelpers"
import { exportReportContainerToCsv, exportReportContainerToPdf } from "../../../utils/reportExport"
import type { BookingsReportProps } from "./reportTypes"

type GroupByType = "none" | "date" | "site" | "area"

const ForecastAvailabilityReport: React.FC<BookingsReportProps> = ({ headerControls }) => {
  const reportRef = useRef<HTMLDivElement | null>(null)
  const { bookings = [], tables = [], companyState } = useBookingsReportContext()
  const { sites = [] } = companyState

  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("week")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [customStartDate, setCustomStartDate] = useState<Date>(new Date())
  const [customEndDate, setCustomEndDate] = useState<Date>(addDays(new Date(), 7))
  const [groupBy, setGroupBy] = useState<GroupByType>("date")
  const [selectedSites, setSelectedSites] = useState<string[]>([])
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])
  const [selectedBookingTypes, setSelectedBookingTypes] = useState<string[]>([])

  const { startDate, endDate } = useMemo(() => {
    // For forecast, we want future dates, so adjust accordingly
    if (dateType === "week") {
      return { startDate: currentDate, endDate: addDays(currentDate, 7) }
    } else if (dateType === "month") {
      return { startDate: currentDate, endDate: addDays(currentDate, 30) }
    } else {
      return calculateDateRange(dateType, currentDate, customStartDate, customEndDate)
    }
  }, [dateType, currentDate, customStartDate, customEndDate])

  const futureBookings = useMemo(() => {
    try {
      // Filter bookings by company context first
      const contextFilteredBookings = filterByCompanyContext(
        safeArray(bookings),
        companyState.selectedSiteID,
        companyState.selectedSubsiteID
      )
      
      return contextFilteredBookings.filter((booking: any) => {
        if (!booking.date) return false
        
        const bookingDate = parseISO(booking.date)
        const inDateRange = isDateInRange(booking.date, startDate, endDate)
        const isFuture = bookingDate >= new Date()
        const matchesSite = selectedSites.length === 0 || selectedSites.includes(safeString(booking.siteId))
        const matchesArea = selectedAreas.length === 0 || selectedAreas.includes(safeString(booking.area))
        const matchesType = selectedBookingTypes.length === 0 || selectedBookingTypes.includes(safeString(booking.bookingType))
        
        return inDateRange && isFuture && matchesSite && matchesArea && matchesType
      })
    } catch (error) {
      console.error("Error filtering future bookings:", error)
      return []
    }
  }, [bookings, startDate, endDate, selectedSites, selectedAreas, selectedBookingTypes, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const venueCapacity = useMemo(() => {
    try {
      return safeArray(tables).reduce((sum: number, table: any) => sum + safeNumber(table.capacity, 0), 0) || 100
    } catch (error) {
      console.error("Error calculating venue capacity:", error)
      return 100
    }
  }, [tables])

  const avgSpend = 35 // This should ideally come from historical POS data

  const metrics = useMemo(() => {
    const totalBookedCovers = futureBookings.reduce((sum: number, booking: any) => 
      sum + (booking.guests || booking.covers || booking.guestCount || 0), 0
    )
    
    const confirmedBookings = futureBookings.filter((b: any) => 
      b.status === "confirmed" || b.status === "completed"
    ).length
    
    const enquiries = futureBookings.filter((b: any) => 
      b.status === "enquiry" || b.status === "pending"
    ).length
    
    const capacityPercent = venueCapacity > 0 ? (totalBookedCovers / venueCapacity) * 100 : 0
    
    const forecastRevenue = totalBookedCovers * avgSpend
    
    // Estimate walk-in forecast (20% of capacity not yet booked)
    const remainingCapacity = Math.max(0, venueCapacity - totalBookedCovers)
    const walkInForecast = Math.round(remainingCapacity * 0.2)
    
    const totalForecastCovers = totalBookedCovers + walkInForecast
    const totalForecastRevenue = totalForecastCovers * avgSpend
    
    // Calculate variance vs target (assuming 80% capacity is target)
    const targetCapacity = venueCapacity * 0.8
    const variance = totalForecastCovers - targetCapacity
    const variancePercent = targetCapacity > 0 ? (variance / targetCapacity) * 100 : 0

    return {
      totalBookedCovers,
      confirmedBookings,
      enquiries,
      capacityPercent,
      forecastRevenue,
      walkInForecast,
      totalForecastCovers,
      totalForecastRevenue,
      venueCapacity,
      remainingCapacity,
      targetCapacity,
      variance,
      variancePercent,
    }
  }, [futureBookings, venueCapacity, avgSpend])

  const groupedData = useMemo(() => {
    if (groupBy === "none") return []

    const groups: Record<string, any> = {}

    futureBookings.forEach((booking: any) => {
      let key = ""
      
      switch (groupBy) {
        case "date":
          key = format(parseISO(booking.date), "yyyy-MM-dd")
          break
        case "site":
          key = booking.siteId || "Unknown"
          break
        case "area":
          key = booking.area || "Unknown"
          break
      }

      if (!groups[key]) {
        groups[key] = {
          key,
          bookings: 0,
          confirmed: 0,
          enquiries: 0,
          bookedCovers: 0,
          capacity: venueCapacity,
        }
      }

      groups[key].bookings += 1
      
      if (booking.status === "confirmed" || booking.status === "completed") {
        groups[key].confirmed += 1
      }
      if (booking.status === "enquiry" || booking.status === "pending") {
        groups[key].enquiries += 1
      }
      
      groups[key].bookedCovers += booking.guests || booking.covers || booking.guestCount || 0
    })

    return Object.values(groups).map((group: any) => {
      const capacityPercent = group.capacity > 0 ? (group.bookedCovers / group.capacity) * 100 : 0
      const walkInForecast = Math.round((group.capacity - group.bookedCovers) * 0.2)
      const totalForecast = group.bookedCovers + walkInForecast
      const forecastRevenue = totalForecast * avgSpend
      const targetCapacity = group.capacity * 0.8
      const variance = totalForecast - targetCapacity
      
      return {
        ...group,
        capacityPercent,
        walkInForecast,
        totalForecast,
        forecastRevenue,
        targetCapacity,
        variance,
        status: capacityPercent >= 80 ? "high" : capacityPercent >= 60 ? "medium" : "low",
      }
    }).sort((a: any, b: any) => {
      if (groupBy === "date") {
        return a.key.localeCompare(b.key)
      }
      return b.bookedCovers - a.bookedCovers
    })
  }, [futureBookings, groupBy, venueCapacity, avgSpend])

  const siteFilterOptions = useMemo(() => 
    sites.map((site: any) => ({ id: site.id, name: site.name })),
    [sites]
  )

  const areaOptions = useMemo(() => {
    const areas = new Set(bookings.map((b: any) => b.area).filter(Boolean))
    return Array.from(areas).map(area => ({ id: area as string, name: area as string }))
  }, [bookings])

  const bookingTypeOptions = useMemo(() => [
    { id: "standard", name: "Standard" },
    { id: "event", name: "Event" },
    { id: "private", name: "Private Hire" },
  ], [])

  const groupByOptions = useMemo(() => [
    { value: "none", label: "No Grouping" },
    { value: "date", label: "By Date" },
    { value: "site", label: "By Site" },
    { value: "area", label: "By Area" },
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
        ]}
        groupByOptions={groupByOptions}
        groupByValue={groupBy}
        onGroupByChange={(value) => setGroupBy(value as GroupByType)}
        onExportCSV={() => exportReportContainerToCsv(reportRef.current, "forecast-availability-report.csv")}
        onExportPDF={() => exportReportContainerToPdf(reportRef.current, "Forecast Availability Report", "forecast-availability-report.pdf")}
      />

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Booked Covers</Typography>
              <Typography variant="h5">{metrics.totalBookedCovers}</Typography>
              <Typography variant="caption" color="text.secondary">
                {metrics.confirmedBookings} confirmed, {metrics.enquiries} enquiries
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Capacity %</Typography>
              <Typography 
                variant="h5" 
                color={metrics.capacityPercent >= 80 ? "success.main" : metrics.capacityPercent >= 60 ? "warning.main" : "error.main"}
              >
                {metrics.capacityPercent.toFixed(1)}%
              </Typography>
              <Box sx={{ mt: 1 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.min(metrics.capacityPercent, 100)}
                  color={metrics.capacityPercent >= 80 ? "success" : metrics.capacityPercent >= 60 ? "warning" : "error"}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Forecast Revenue</Typography>
              <Typography variant="h5">£{metrics.forecastRevenue.toFixed(0)}</Typography>
              <Typography variant="caption" color="text.secondary">
                from confirmed bookings
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Forecast</Typography>
              <Typography variant="h5">£{metrics.totalForecastRevenue.toFixed(0)}</Typography>
              <Typography variant="caption" color="text.secondary">
                inc. walk-in forecast
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Capacity</Typography>
              <Typography variant="h6">{metrics.venueCapacity} covers</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Remaining Capacity</Typography>
              <Typography variant="h6">{metrics.remainingCapacity} covers</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Variance vs Target</Typography>
              <Typography 
                variant="h6" 
                color={metrics.variance >= 0 ? "success.main" : "error.main"}
              >
                {metrics.variance >= 0 ? "+" : ""}{metrics.variance.toFixed(0)} ({metrics.variancePercent >= 0 ? "+" : ""}{metrics.variancePercent.toFixed(1)}%)
              </Typography>
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
                  <TableCell align="right">Confirmed</TableCell>
                  <TableCell align="right">Enquiries</TableCell>
                  <TableCell align="right">Booked Covers</TableCell>
                  <TableCell align="right">Walk-in Forecast</TableCell>
                  <TableCell align="right">Total Forecast</TableCell>
                  <TableCell align="right">Capacity %</TableCell>
                  <TableCell align="right">Forecast Revenue</TableCell>
                  <TableCell align="right">Variance</TableCell>
                  <TableCell align="right">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupedData.map((row: any) => (
                  <TableRow key={row.key}>
                    <TableCell>{row.key}</TableCell>
                    <TableCell align="right">{row.bookings}</TableCell>
                    <TableCell align="right">
                      <Chip label={row.confirmed} size="small" color="success" />
                    </TableCell>
                    <TableCell align="right">
                      <Chip label={row.enquiries} size="small" color="warning" />
                    </TableCell>
                    <TableCell align="right"><strong>{row.bookedCovers}</strong></TableCell>
                    <TableCell align="right">{row.walkInForecast}</TableCell>
                    <TableCell align="right"><strong>{row.totalForecast}</strong></TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={Math.min(row.capacityPercent, 100)}
                          sx={{ width: 60 }}
                          color={row.status === "high" ? "success" : row.status === "medium" ? "warning" : "error"}
                        />
                        <Typography variant="body2">{row.capacityPercent.toFixed(0)}%</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">£{row.forecastRevenue.toFixed(0)}</TableCell>
                    <TableCell align="right">
                      <strong style={{ color: row.variance >= 0 ? "#4caf50" : "#f44336" }}>
                        {row.variance >= 0 ? "+" : ""}{row.variance.toFixed(0)}
                      </strong>
                    </TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={row.status} 
                        size="small" 
                        color={row.status === "high" ? "success" : row.status === "medium" ? "warning" : "error"}
                      />
                    </TableCell>
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

export default ForecastAvailabilityReport

