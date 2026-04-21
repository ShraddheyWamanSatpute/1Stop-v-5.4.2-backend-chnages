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
import { differenceInDays } from "date-fns"
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

type GroupByType = "none" | "site" | "source" | "leadTime" | "eventType"

const BookingVelocityReport: React.FC<BookingsReportProps> = ({ headerControls }) => {
  const reportRef = useRef<HTMLDivElement | null>(null)
  const { bookings = [], companyState } = useBookingsReportContext()
  const { sites = [] } = companyState

  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("week")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [customStartDate, setCustomStartDate] = useState<Date>(new Date(new Date().setDate(new Date().getDate() - 7)))
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date())
  const [groupBy, setGroupBy] = useState<GroupByType>("none")
  const [selectedSites, setSelectedSites] = useState<string[]>([])
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([])
  const [selectedLeadTimeRanges, setSelectedLeadTimeRanges] = useState<string[]>([])

  const { startDate, endDate } = useMemo(() => {
    return calculateDateRange(dateType, currentDate, customStartDate, customEndDate)
  }, [dateType, currentDate, customStartDate, customEndDate])

  // Helper function to categorize lead time
  const getLeadTimeRange = (days: number) => {
    if (days <= 2) return "0-2 days"
    if (days <= 7) return "3-7 days"
    if (days <= 30) return "8-30 days"
    return "30+ days"
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
        
        // Safely parse dates
        const bookingDate = safeParseDate(booking.date)
        const createdDate = booking.createdAt ? safeParseDate(booking.createdAt) : bookingDate
        if (!bookingDate) return false // Skip if date is invalid
        
        const inDateRange = isDateInRange(booking.createdAt || booking.date, startDate, endDate)
        const matchesSite = selectedSites.length === 0 || selectedSites.includes(safeString(booking.siteId))
        const matchesSource = selectedSources.length === 0 || selectedSources.includes(safeString(booking.source))
        const matchesEventType = selectedEventTypes.length === 0 || selectedEventTypes.includes(safeString(booking.bookingType))
        
        const leadTime = bookingDate && createdDate ? differenceInDays(bookingDate, createdDate) : 0
        const leadTimeRange = getLeadTimeRange(leadTime)
        const matchesLeadTime = selectedLeadTimeRanges.length === 0 || selectedLeadTimeRanges.includes(leadTimeRange)
      
        return inDateRange && matchesSite && matchesSource && matchesEventType && matchesLeadTime
      })
    } catch (error) {
      console.error("Error filtering bookings:", error)
      return []
    }
  }, [bookings, startDate, endDate, selectedSites, selectedSources, selectedEventTypes, selectedLeadTimeRanges, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const metrics = useMemo(() => {
    const bookingsCreated = filteredBookings.length
    const bookingsModified = filteredBookings.filter((b: any) => b.updatedAt && b.updatedAt !== b.createdAt).length
    const bookingsCancelled = filteredBookings.filter((b: any) => b.status === "cancelled").length
    
    const enquiries = filteredBookings.filter((b: any) => b.status === "enquiry" || b.status === "pending").length
    const converted = filteredBookings.filter((b: any) => b.status === "confirmed" || b.status === "completed").length
    const conversionRate = enquiries > 0 ? (converted / enquiries) * 100 : 0
    
    // Calculate lead times
    const leadTimes = filteredBookings.map((booking: any) => {
      const bookingDate = safeParseDate(booking.date)
      const createdDate = booking.createdAt ? safeParseDate(booking.createdAt) : bookingDate
      if (!bookingDate || !createdDate) return 0
      return differenceInDays(bookingDate, createdDate)
    })
    
    const avgLeadTime = leadTimes.length > 0 ? leadTimes.reduce((sum, time) => sum + time, 0) / leadTimes.length : 0
    
    // Calculate rebooking rate
    const customerEmails = filteredBookings.map((b: any) => b.email || b.customer?.email).filter(Boolean)
    const uniqueCustomers = new Set(customerEmails).size
    const repeatCustomers = customerEmails.length - uniqueCustomers
    const rebookingRate = uniqueCustomers > 0 ? (repeatCustomers / uniqueCustomers) * 100 : 0
    
    // Lead time distribution
    const leadTimeDistribution = {
      "0-2 days": leadTimes.filter(lt => lt <= 2).length,
      "3-7 days": leadTimes.filter(lt => lt > 2 && lt <= 7).length,
      "8-30 days": leadTimes.filter(lt => lt > 7 && lt <= 30).length,
      "30+ days": leadTimes.filter(lt => lt > 30).length,
    }

    return {
      bookingsCreated,
      bookingsModified,
      bookingsCancelled,
      enquiries,
      converted,
      conversionRate,
      avgLeadTime,
      rebookingRate,
      leadTimeDistribution,
    }
  }, [filteredBookings])

  const groupedData = useMemo(() => {
    if (groupBy === "none") return []

    const groups: Record<string, any> = {}

    filteredBookings.forEach((booking: any) => {
      let key = ""
      
      const bookingDate = safeParseDate(booking.date)
      const createdDate = booking.createdAt ? safeParseDate(booking.createdAt) : bookingDate
      const leadTime = bookingDate && createdDate ? differenceInDays(bookingDate, createdDate) : 0
      
      switch (groupBy) {
        case "site":
          key = booking.siteId || "Unknown"
          break
        case "source":
          key = booking.source || "Unknown"
          break
        case "leadTime":
          key = getLeadTimeRange(leadTime)
          break
        case "eventType":
          key = booking.bookingType || "Standard"
          break
      }

      if (!groups[key]) {
        groups[key] = {
          key,
          created: 0,
          modified: 0,
          cancelled: 0,
          enquiries: 0,
          converted: 0,
          leadTimes: [],
        }
      }

      groups[key].created += 1
      if (booking.updatedAt && booking.updatedAt !== booking.createdAt) groups[key].modified += 1
      if (booking.status === "cancelled") groups[key].cancelled += 1
      if (booking.status === "enquiry" || booking.status === "pending") groups[key].enquiries += 1
      if (booking.status === "confirmed" || booking.status === "completed") groups[key].converted += 1
      groups[key].leadTimes.push(leadTime)
    })

    return Object.values(groups).map((group: any) => ({
      ...group,
      avgLeadTime: group.leadTimes.length > 0 ? group.leadTimes.reduce((sum: number, time: number) => sum + time, 0) / group.leadTimes.length : 0,
      conversionRate: group.enquiries > 0 ? (group.converted / group.enquiries) * 100 : 0,
    })).sort((a: any, b: any) => b.created - a.created)
  }, [filteredBookings, groupBy])

  const siteFilterOptions = useMemo(() => 
    sites.map((site: any) => ({ id: site.id, name: site.name })),
    [sites]
  )

  const sourceOptions = useMemo(() => [
    { id: "website", name: "Website" },
    { id: "phone", name: "Phone" },
    { id: "walk-in", name: "Walk-in" },
    { id: "partner", name: "Partner" },
    { id: "social", name: "Social Media" },
  ], [])

  const eventTypeOptions = useMemo(() => [
    { id: "standard", name: "Standard" },
    { id: "event", name: "Event" },
    { id: "private", name: "Private Hire" },
    { id: "corporate", name: "Corporate" },
  ], [])

  const leadTimeRangeOptions = useMemo(() => [
    { id: "0-2 days", name: "0-2 days" },
    { id: "3-7 days", name: "3-7 days" },
    { id: "8-30 days", name: "8-30 days" },
    { id: "30+ days", name: "30+ days" },
  ], [])

  const groupByOptions = useMemo(() => [
    { value: "none", label: "No Grouping" },
    { value: "site", label: "By Site" },
    { value: "source", label: "By Source" },
    { value: "leadTime", label: "By Lead Time" },
    { value: "eventType", label: "By Event Type" },
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
            label: "Source",
            options: sourceOptions,
            selectedValues: selectedSources,
            onSelectionChange: setSelectedSources,
          },
          {
            label: "Event Type",
            options: eventTypeOptions,
            selectedValues: selectedEventTypes,
            onSelectionChange: setSelectedEventTypes,
          },
          {
            label: "Lead Time Range",
            options: leadTimeRangeOptions,
            selectedValues: selectedLeadTimeRanges,
            onSelectionChange: setSelectedLeadTimeRanges,
          },
        ]}
        groupByOptions={groupByOptions}
        groupByValue={groupBy}
        onGroupByChange={(value) => setGroupBy(value as GroupByType)}
        onExportCSV={() => exportReportContainerToCsv(reportRef.current, "booking-velocity-report.csv")}
        onExportPDF={() => exportReportContainerToPdf(reportRef.current, "Booking Velocity Report", "booking-velocity-report.pdf")}
      />

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Bookings Created</Typography>
              <Typography variant="h5">{metrics.bookingsCreated}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Bookings Modified</Typography>
              <Typography variant="h5">{metrics.bookingsModified}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Bookings Cancelled</Typography>
              <Typography variant="h5" color="error">{metrics.bookingsCancelled}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Avg Lead Time</Typography>
              <Typography variant="h5">{metrics.avgLeadTime.toFixed(0)} days</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Enquiries</Typography>
              <Typography variant="h6">{metrics.enquiries}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Converted</Typography>
              <Typography variant="h6" color="success.main">{metrics.converted}</Typography>
              <Typography variant="caption" color="text.secondary">
                {metrics.conversionRate.toFixed(1)}% conversion rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Rebooking Rate</Typography>
              <Typography variant="h6">{metrics.rebookingRate.toFixed(1)}%</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Lead Time Distribution */}
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Lead Time Distribution</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Object.entries(metrics.leadTimeDistribution).map(([range, count]) => (
          <Grid item xs={6} sm={3} key={range}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="caption">{range}</Typography>
                <Typography variant="h6">{count as number}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {metrics.bookingsCreated > 0 ? ((count as number / metrics.bookingsCreated) * 100).toFixed(1) : 0}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
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
                  <TableCell align="right">Created</TableCell>
                  <TableCell align="right">Modified</TableCell>
                  <TableCell align="right">Cancelled</TableCell>
                  <TableCell align="right">Enquiries</TableCell>
                  <TableCell align="right">Converted</TableCell>
                  <TableCell align="right">Conversion %</TableCell>
                  <TableCell align="right">Avg Lead Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupedData.map((row: any) => (
                  <TableRow key={row.key}>
                    <TableCell>{row.key}</TableCell>
                    <TableCell align="right"><strong>{row.created}</strong></TableCell>
                    <TableCell align="right">{row.modified}</TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={row.cancelled} 
                        size="small" 
                        color={row.cancelled > 0 ? "error" : "default"}
                      />
                    </TableCell>
                    <TableCell align="right">{row.enquiries}</TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={row.converted} 
                        size="small" 
                        color="success"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <strong>{row.conversionRate.toFixed(1)}%</strong>
                    </TableCell>
                    <TableCell align="right">{row.avgLeadTime.toFixed(0)} days</TableCell>
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

export default BookingVelocityReport

