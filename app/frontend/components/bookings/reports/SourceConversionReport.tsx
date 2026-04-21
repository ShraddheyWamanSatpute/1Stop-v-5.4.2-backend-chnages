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
import { 
  calculateDateRange, 
  filterByCompanyContext, 
  isDateInRange, 
  safeArray,
  safeString 
} from "../../../utils/reportHelpers"
import { exportReportContainerToCsv, exportReportContainerToPdf } from "../../../utils/reportExport"
import type { BookingsReportProps } from "./reportTypes"

type GroupByType = "none" | "source" | "site" | "bookingType"

const SourceConversionReport: React.FC<BookingsReportProps> = ({ headerControls }) => {
  const reportRef = useRef<HTMLDivElement | null>(null)
  const { bookings = [], companyState } = useBookingsReportContext()
  const { sites = [] } = companyState

  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("week")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [customStartDate, setCustomStartDate] = useState<Date>(new Date(new Date().setDate(new Date().getDate() - 7)))
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date())
  const [groupBy, setGroupBy] = useState<GroupByType>("source")
  const [selectedSites, setSelectedSites] = useState<string[]>([])
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [selectedBookingTypes, setSelectedBookingTypes] = useState<string[]>([])

  const { startDate, endDate } = useMemo(() => {
    return calculateDateRange(dateType, currentDate, customStartDate, customEndDate)
  }, [dateType, currentDate, customStartDate, customEndDate])

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
        const matchesSource = selectedSources.length === 0 || selectedSources.includes(safeString(booking.source))
        const matchesType = selectedBookingTypes.length === 0 || selectedBookingTypes.includes(safeString(booking.bookingType))
        
        return inDateRange && matchesSite && matchesSource && matchesType
      })
    } catch (error) {
      console.error("Error filtering bookings:", error)
      return []
    }
  }, [bookings, startDate, endDate, selectedSites, selectedSources, selectedBookingTypes, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const metrics = useMemo(() => {
    const totalEnquiries = filteredBookings.filter((b: any) => 
      b.status === "enquiry" || b.status === "pending"
    ).length
    
    const confirmedBookings = filteredBookings.filter((b: any) => 
      b.status === "confirmed" || b.status === "completed"
    ).length
    
    const conversionRate = totalEnquiries > 0 ? (confirmedBookings / totalEnquiries) * 100 : 0
    
    const totalCovers = filteredBookings.reduce((sum: number, booking: any) => 
      sum + (booking.guests || booking.covers || booking.guestCount || 0), 0
    )
    
    const avgCoversPerBooking = filteredBookings.length > 0 ? totalCovers / filteredBookings.length : 0
    
    const totalValue = filteredBookings.reduce((sum: number, booking: any) => 
      sum + (booking.totalAmount || 0), 0
    )
    
    const avgBookingValue = filteredBookings.length > 0 ? totalValue / filteredBookings.length : 0
    
    const cancellations = filteredBookings.filter((b: any) => b.status === "cancelled").length
    const cancellationRate = filteredBookings.length > 0 ? (cancellations / filteredBookings.length) * 100 : 0
    
    // Source breakdown
    const sourceBreakdown = filteredBookings.reduce((acc: any, booking: any) => {
      const source = booking.source || "unknown"
      if (!acc[source]) acc[source] = { 
        enquiries: 0, 
        confirmed: 0, 
        cancelled: 0,
        covers: 0,
        value: 0
      }
      
      if (booking.status === "enquiry" || booking.status === "pending") {
        acc[source].enquiries += 1
      }
      if (booking.status === "confirmed" || booking.status === "completed") {
        acc[source].confirmed += 1
      }
      if (booking.status === "cancelled") {
        acc[source].cancelled += 1
      }
      
      acc[source].covers += booking.guests || booking.covers || booking.guestCount || 0
      acc[source].value += booking.totalAmount || 0
      
      return acc
    }, {})

    return {
      totalEnquiries,
      confirmedBookings,
      conversionRate,
      totalCovers,
      avgCoversPerBooking,
      totalValue,
      avgBookingValue,
      cancellations,
      cancellationRate,
      sourceBreakdown,
    }
  }, [filteredBookings])

  const groupedData = useMemo(() => {
    if (groupBy === "none") return []

    const groups: Record<string, any> = {}

    filteredBookings.forEach((booking: any) => {
      let key = ""
      
      switch (groupBy) {
        case "source":
          key = booking.source || "Unknown"
          break
        case "site":
          key = booking.siteId || "Unknown"
          break
        case "bookingType":
          key = booking.bookingType || "Standard"
          break
      }

      if (!groups[key]) {
        groups[key] = {
          key,
          enquiries: 0,
          confirmed: 0,
          cancelled: 0,
          covers: 0,
          value: 0,
          bookings: 0,
        }
      }

      groups[key].bookings += 1
      
      if (booking.status === "enquiry" || booking.status === "pending") {
        groups[key].enquiries += 1
      }
      if (booking.status === "confirmed" || booking.status === "completed") {
        groups[key].confirmed += 1
      }
      if (booking.status === "cancelled") {
        groups[key].cancelled += 1
      }
      
      groups[key].covers += booking.guests || booking.covers || booking.guestCount || 0
      groups[key].value += booking.totalAmount || 0
    })

    return Object.values(groups).map((group: any) => ({
      ...group,
      conversionRate: group.enquiries > 0 ? (group.confirmed / group.enquiries) * 100 : 0,
      cancellationRate: group.bookings > 0 ? (group.cancelled / group.bookings) * 100 : 0,
      avgCovers: group.bookings > 0 ? group.covers / group.bookings : 0,
      avgValue: group.bookings > 0 ? group.value / group.bookings : 0,
    })).sort((a: any, b: any) => b.bookings - a.bookings)
  }, [filteredBookings, groupBy])

  const topSources = useMemo(() => {
    return Object.entries(metrics.sourceBreakdown)
      .map(([source, data]: [string, any]) => ({
        source,
        ...data,
        conversionRate: data.enquiries > 0 ? (data.confirmed / data.enquiries) * 100 : 0,
        avgCovers: (data.confirmed + data.enquiries) > 0 ? data.covers / (data.confirmed + data.enquiries) : 0,
        avgValue: (data.confirmed + data.enquiries) > 0 ? data.value / (data.confirmed + data.enquiries) : 0,
      }))
      .sort((a, b) => b.confirmed - a.confirmed)
  }, [metrics.sourceBreakdown])

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
    { id: "email", name: "Email" },
    { id: "referral", name: "Referral" },
  ], [])

  const bookingTypeOptions = useMemo(() => [
    { id: "standard", name: "Standard" },
    { id: "event", name: "Event" },
    { id: "private", name: "Private Hire" },
    { id: "corporate", name: "Corporate" },
  ], [])

  const groupByOptions = useMemo(() => [
    { value: "none", label: "No Grouping" },
    { value: "source", label: "By Source" },
    { value: "site", label: "By Site" },
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
            label: "Source",
            options: sourceOptions,
            selectedValues: selectedSources,
            onSelectionChange: setSelectedSources,
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
        onExportCSV={() => exportReportContainerToCsv(reportRef.current, "source-conversion-report.csv")}
        onExportPDF={() => exportReportContainerToPdf(reportRef.current, "Source Conversion Report", "source-conversion-report.pdf")}
      />

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Enquiries</Typography>
              <Typography variant="h5">{metrics.totalEnquiries}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Confirmed Bookings</Typography>
              <Typography variant="h5" color="success.main">{metrics.confirmedBookings}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Conversion Rate</Typography>
              <Typography variant="h5" color={metrics.conversionRate > 70 ? "success.main" : "warning.main"}>
                {metrics.conversionRate.toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Cancellation Rate</Typography>
              <Typography variant="h5" color="error">{metrics.cancellationRate.toFixed(1)}%</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Covers</Typography>
              <Typography variant="h6">{metrics.totalCovers}</Typography>
              <Typography variant="caption" color="text.secondary">
                Avg: {metrics.avgCoversPerBooking.toFixed(1)} per booking
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Value</Typography>
              <Typography variant="h6">£{metrics.totalValue.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Avg Booking Value</Typography>
              <Typography variant="h6">£{metrics.avgBookingValue.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Top Sources Performance */}
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Source Performance</Typography>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Source</TableCell>
              <TableCell align="right">Enquiries</TableCell>
              <TableCell align="right">Confirmed</TableCell>
              <TableCell align="right">Conversion %</TableCell>
              <TableCell align="right">Cancelled</TableCell>
              <TableCell align="right">Avg Covers</TableCell>
              <TableCell align="right">Avg Value</TableCell>
              <TableCell align="right">Total Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {topSources.map((source, index) => (
              <TableRow key={index}>
                <TableCell><strong>{source.source}</strong></TableCell>
                <TableCell align="right">{source.enquiries}</TableCell>
                <TableCell align="right">
                  <Chip label={source.confirmed} size="small" color="success" />
                </TableCell>
                <TableCell align="right">
                  <strong style={{ color: source.conversionRate > 70 ? "#4caf50" : "#ff9800" }}>
                    {source.conversionRate.toFixed(1)}%
                  </strong>
                </TableCell>
                <TableCell align="right">
                  <Chip 
                    label={source.cancelled} 
                    size="small" 
                    color={source.cancelled > 0 ? "error" : "default"}
                  />
                </TableCell>
                <TableCell align="right">{source.avgCovers.toFixed(1)}</TableCell>
                <TableCell align="right">£{source.avgValue.toFixed(2)}</TableCell>
                <TableCell align="right"><strong>£{source.value.toFixed(2)}</strong></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

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
                  <TableCell align="right">Total Bookings</TableCell>
                  <TableCell align="right">Enquiries</TableCell>
                  <TableCell align="right">Confirmed</TableCell>
                  <TableCell align="right">Conversion %</TableCell>
                  <TableCell align="right">Cancelled</TableCell>
                  <TableCell align="right">Cancel %</TableCell>
                  <TableCell align="right">Avg Covers</TableCell>
                  <TableCell align="right">Avg Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupedData.map((row: any) => (
                  <TableRow key={row.key}>
                    <TableCell>{row.key}</TableCell>
                    <TableCell align="right"><strong>{row.bookings}</strong></TableCell>
                    <TableCell align="right">{row.enquiries}</TableCell>
                    <TableCell align="right">
                      <Chip label={row.confirmed} size="small" color="success" />
                    </TableCell>
                    <TableCell align="right">
                      <strong style={{ color: row.conversionRate > 70 ? "#4caf50" : "#ff9800" }}>
                        {row.conversionRate.toFixed(1)}%
                      </strong>
                    </TableCell>
                    <TableCell align="right">
                      <Chip label={row.cancelled} size="small" color={row.cancelled > 0 ? "error" : "default"} />
                    </TableCell>
                    <TableCell align="right">{row.cancellationRate.toFixed(1)}%</TableCell>
                    <TableCell align="right">{row.avgCovers.toFixed(1)}</TableCell>
                    <TableCell align="right">£{row.avgValue.toFixed(2)}</TableCell>
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

export default SourceConversionReport

