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

type GroupByType = "none" | "event" | "site" | "source"

const EventPromotionPerformanceReport: React.FC<BookingsReportProps> = ({ headerControls }) => {
  const reportRef = useRef<HTMLDivElement | null>(null)
  const { bookings = [], companyState } = useBookingsReportContext()
  const { sites = [] } = companyState

  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("week")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [customStartDate, setCustomStartDate] = useState<Date>(new Date(new Date().setDate(new Date().getDate() - 7)))
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date())
  const [groupBy, setGroupBy] = useState<GroupByType>("event")
  const [selectedSites, setSelectedSites] = useState<string[]>([])
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [selectedSources, setSelectedSources] = useState<string[]>([])

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
        // Only include bookings with events or promotions
        const tags = safeArray(booking.tags)
        if (!booking.eventName && !booking.promotionCode && !tags.includes("event") && safeString(booking.bookingType) !== "event") {
          return false
        }
        
        if (!booking.date) return false
        
        const inDateRange = isDateInRange(booking.date, startDate, endDate)
        const matchesSite = selectedSites.length === 0 || selectedSites.includes(safeString(booking.siteId))
        
        const eventName = safeString(booking.eventName || booking.promotionCode, "Unnamed Event")
        const matchesEvent = selectedEvents.length === 0 || selectedEvents.includes(eventName)
        
        const matchesSource = selectedSources.length === 0 || selectedSources.includes(safeString(booking.source))
        
        return inDateRange && matchesSite && matchesEvent && matchesSource
      })
    } catch (error) {
      console.error("Error filtering event/promotion bookings:", error)
      return []
    }
  }, [bookings, startDate, endDate, selectedSites, selectedEvents, selectedSources, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const metrics = useMemo(() => {
    const totalBookings = filteredBookings.length
    
    const totalCovers = filteredBookings.reduce((sum: number, booking: any) => 
      sum + (booking.guests || booking.covers || booking.guestCount || 0), 0
    )
    
    const totalRevenue = filteredBookings.reduce((sum: number, booking: any) => 
      sum + (booking.totalAmount || 0), 0
    )
    
    const avgSpendPerGuest = totalCovers > 0 ? totalRevenue / totalCovers : 0
    
    const enquiries = filteredBookings.filter((b: any) => 
      b.status === "enquiry" || b.status === "pending"
    ).length
    
    const confirmed = filteredBookings.filter((b: any) => 
      b.status === "confirmed" || b.status === "completed"
    ).length
    
    const conversionRate = enquiries > 0 ? (confirmed / enquiries) * 100 : 0
    
    const depositsCollected = filteredBookings.reduce((sum: number, booking: any) => 
      sum + (booking.deposit || 0), 0
    )
    
    const preorders = filteredBookings.filter((b: any) => 
      b.preorder || b.preorderItems
    ).length
    
    const preordersValue = filteredBookings.reduce((sum: number, booking: any) => 
      sum + (booking.preorder?.totalAmount || booking.preorderValue || 0), 0
    )
    
    // Event breakdown
    const eventBreakdown = filteredBookings.reduce((acc: any, booking: any) => {
      const eventName = booking.eventName || booking.promotionCode || "Unnamed Event"
      if (!acc[eventName]) {
        acc[eventName] = {
          bookings: 0,
          enquiries: 0,
          confirmed: 0,
          covers: 0,
          revenue: 0,
          deposits: 0,
          preorders: 0,
        }
      }
      
      acc[eventName].bookings += 1
      acc[eventName].covers += booking.guests || booking.covers || booking.guestCount || 0
      acc[eventName].revenue += booking.totalAmount || 0
      acc[eventName].deposits += booking.deposit || 0
      
      if (booking.status === "enquiry" || booking.status === "pending") {
        acc[eventName].enquiries += 1
      }
      if (booking.status === "confirmed" || booking.status === "completed") {
        acc[eventName].confirmed += 1
      }
      if (booking.preorder || booking.preorderItems) {
        acc[eventName].preorders += 1
      }
      
      return acc
    }, {})
    
    // Source breakdown
    const sourceBreakdown = filteredBookings.reduce((acc: any, booking: any) => {
      const source = booking.source || "unknown"
      if (!acc[source]) acc[source] = { count: 0, revenue: 0 }
      acc[source].count += 1
      acc[source].revenue += booking.totalAmount || 0
      return acc
    }, {})

    return {
      totalBookings,
      totalCovers,
      totalRevenue,
      avgSpendPerGuest,
      enquiries,
      confirmed,
      conversionRate,
      depositsCollected,
      preorders,
      preordersValue,
      eventBreakdown,
      sourceBreakdown,
    }
  }, [filteredBookings])

  const groupedData = useMemo(() => {
    if (groupBy === "none") return []

    const groups: Record<string, any> = {}

    filteredBookings.forEach((booking: any) => {
      let key = ""
      
      switch (groupBy) {
        case "event":
          key = booking.eventName || booking.promotionCode || "Unnamed Event"
          break
        case "site":
          key = booking.siteId || "Unknown"
          break
        case "source":
          key = booking.source || "Unknown"
          break
      }

      if (!groups[key]) {
        groups[key] = {
          key,
          bookings: 0,
          enquiries: 0,
          confirmed: 0,
          covers: 0,
          revenue: 0,
          deposits: 0,
          preorders: 0,
        }
      }

      groups[key].bookings += 1
      groups[key].covers += booking.guests || booking.covers || booking.guestCount || 0
      groups[key].revenue += booking.totalAmount || 0
      groups[key].deposits += booking.deposit || 0
      
      if (booking.status === "enquiry" || booking.status === "pending") {
        groups[key].enquiries += 1
      }
      if (booking.status === "confirmed" || booking.status === "completed") {
        groups[key].confirmed += 1
      }
      if (booking.preorder || booking.preorderItems) {
        groups[key].preorders += 1
      }
    })

    return Object.values(groups).map((group: any) => ({
      ...group,
      conversionRate: group.enquiries > 0 ? (group.confirmed / group.enquiries) * 100 : 0,
      avgSpendPerGuest: group.covers > 0 ? group.revenue / group.covers : 0,
      avgCovers: group.bookings > 0 ? group.covers / group.bookings : 0,
    })).sort((a: any, b: any) => b.revenue - a.revenue)
  }, [filteredBookings, groupBy])

  const topEvents = useMemo(() => {
    return Object.entries(metrics.eventBreakdown)
      .map(([event, data]: [string, any]) => ({
        event,
        ...data,
        conversionRate: data.enquiries > 0 ? (data.confirmed / data.enquiries) * 100 : 0,
        avgSpendPerGuest: data.covers > 0 ? data.revenue / data.covers : 0,
        roi: data.deposits > 0 ? ((data.revenue - data.deposits) / data.deposits) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [metrics.eventBreakdown])

  const siteFilterOptions = useMemo(() => 
    sites.map((site: any) => ({ id: site.id, name: site.name })),
    [sites]
  )

  const eventOptions = useMemo(() => {
    const events = new Set<string>()
    bookings.forEach((b: any) => {
      const event = b.eventName || b.promotionCode
      if (event) events.add(event)
    })
    return Array.from(events).map(event => ({ id: event, name: event }))
  }, [bookings])

  const sourceOptions = useMemo(() => [
    { id: "website", name: "Website" },
    { id: "phone", name: "Phone" },
    { id: "partner", name: "Partner" },
    { id: "social", name: "Social Media" },
    { id: "email", name: "Email" },
  ], [])

  const groupByOptions = useMemo(() => [
    { value: "none", label: "No Grouping" },
    { value: "event", label: "By Event" },
    { value: "site", label: "By Site" },
    { value: "source", label: "By Source" },
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
            label: "Event/Promotion",
            options: eventOptions,
            selectedValues: selectedEvents,
            onSelectionChange: setSelectedEvents,
          },
          {
            label: "Source",
            options: sourceOptions,
            selectedValues: selectedSources,
            onSelectionChange: setSelectedSources,
          },
        ]}
        groupByOptions={groupByOptions}
        groupByValue={groupBy}
        onGroupByChange={(value) => setGroupBy(value as GroupByType)}
        onExportCSV={() => exportReportContainerToCsv(reportRef.current, "event-promotion-performance-report.csv")}
        onExportPDF={() => exportReportContainerToPdf(reportRef.current, "Event Promotion Performance Report", "event-promotion-performance-report.pdf")}
      />

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Bookings</Typography>
              <Typography variant="h5">{metrics.totalBookings}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Covers</Typography>
              <Typography variant="h5">{metrics.totalCovers}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Revenue</Typography>
              <Typography variant="h5" color="success.main">£{metrics.totalRevenue.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Avg Spend/Guest</Typography>
              <Typography variant="h5">£{metrics.avgSpendPerGuest.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Conversion Rate</Typography>
              <Typography variant="h6" color={metrics.conversionRate > 70 ? "success.main" : "warning.main"}>
                {metrics.conversionRate.toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {metrics.confirmed} / {metrics.enquiries} enquiries
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Deposits Collected</Typography>
              <Typography variant="h6">£{metrics.depositsCollected.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Preorders</Typography>
              <Typography variant="h6">{metrics.preorders}</Typography>
              <Typography variant="caption" color="text.secondary">
                £{metrics.preordersValue.toFixed(2)} value
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Top Events/Promotions Performance */}
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Event/Promotion Performance</Typography>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Event/Promotion</TableCell>
              <TableCell align="right">Bookings</TableCell>
              <TableCell align="right">Enquiries</TableCell>
              <TableCell align="right">Confirmed</TableCell>
              <TableCell align="right">Conversion %</TableCell>
              <TableCell align="right">Covers</TableCell>
              <TableCell align="right">Preorders</TableCell>
              <TableCell align="right">Revenue</TableCell>
              <TableCell align="right">Avg Spend/Guest</TableCell>
              <TableCell align="right">Deposits</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {topEvents.map((event, index) => (
              <TableRow key={index}>
                <TableCell>
                  <strong>{event.event}</strong>
                  {index < 3 && (
                    <Chip 
                      label={`#${index + 1}`} 
                      size="small" 
                      color={index === 0 ? "success" : index === 1 ? "primary" : "secondary"}
                      sx={{ ml: 1 }}
                    />
                  )}
                </TableCell>
                <TableCell align="right">{event.bookings}</TableCell>
                <TableCell align="right">{event.enquiries}</TableCell>
                <TableCell align="right">
                  <Chip label={event.confirmed} size="small" color="success" />
                </TableCell>
                <TableCell align="right">
                  <strong style={{ color: event.conversionRate > 70 ? "#4caf50" : "#ff9800" }}>
                    {event.conversionRate.toFixed(1)}%
                  </strong>
                </TableCell>
                <TableCell align="right">{event.covers}</TableCell>
                <TableCell align="right">{event.preorders}</TableCell>
                <TableCell align="right"><strong>£{event.revenue.toFixed(2)}</strong></TableCell>
                <TableCell align="right">£{event.avgSpendPerGuest.toFixed(2)}</TableCell>
                <TableCell align="right">£{event.deposits.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Source Breakdown */}
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Source Breakdown</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Object.entries(metrics.sourceBreakdown).map(([source, data]: [string, any]) => (
          <Grid item xs={6} sm={4} md={3} key={source}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="caption">{source}</Typography>
                <Typography variant="h6">£{data.revenue.toFixed(2)}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {data.count} bookings
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
                  <TableCell align="right">Bookings</TableCell>
                  <TableCell align="right">Enquiries</TableCell>
                  <TableCell align="right">Confirmed</TableCell>
                  <TableCell align="right">Conversion %</TableCell>
                  <TableCell align="right">Covers</TableCell>
                  <TableCell align="right">Avg Covers</TableCell>
                  <TableCell align="right">Preorders</TableCell>
                  <TableCell align="right">Revenue</TableCell>
                  <TableCell align="right">Avg Spend/Guest</TableCell>
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
                    <TableCell align="right">{row.covers}</TableCell>
                    <TableCell align="right">{row.avgCovers.toFixed(1)}</TableCell>
                    <TableCell align="right">{row.preorders}</TableCell>
                    <TableCell align="right"><strong>£{row.revenue.toFixed(2)}</strong></TableCell>
                    <TableCell align="right">£{row.avgSpendPerGuest.toFixed(2)}</TableCell>
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

export default EventPromotionPerformanceReport

