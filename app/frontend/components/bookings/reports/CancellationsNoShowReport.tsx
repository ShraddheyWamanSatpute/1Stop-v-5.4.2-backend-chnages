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
import { parseISO, differenceInDays } from "date-fns"
import { 
  calculateDateRange, 
  filterByCompanyContext, 
  isDateInRange, 
  safeArray,
  safeString
} from "../../../utils/reportHelpers"
import { exportReportContainerToCsv, exportReportContainerToPdf } from "../../../utils/reportExport"
import type { BookingsReportProps } from "./reportTypes"

type GroupByType = "none" | "reason" | "site" | "source" | "leadTime"

const CancellationsNoShowReport: React.FC<BookingsReportProps> = ({ headerControls }) => {
  const reportRef = useRef<HTMLDivElement | null>(null)
  const { bookings = [], companyState } = useBookingsReportContext()
  const { sites = [] } = companyState

  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("week")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [customStartDate, setCustomStartDate] = useState<Date>(new Date(new Date().setDate(new Date().getDate() - 7)))
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date())
  const [groupBy, setGroupBy] = useState<GroupByType>("reason")
  const [selectedSites, setSelectedSites] = useState<string[]>([])
  const [selectedReasons, setSelectedReasons] = useState<string[]>([])
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])

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
        
        const isCancelled = safeString(booking.status) === "cancelled"
        const isNoShow = safeString(booking.tracking) === "No Show" || safeString(booking.status) === "no-show"
        
        if (!isCancelled && !isNoShow) return false
        
        const inDateRange = isDateInRange(booking.date, startDate, endDate)
        const matchesSite = selectedSites.length === 0 || selectedSites.includes(safeString(booking.siteId))
        
        const reason = safeString(booking.cancellationReason || booking.notes, "No reason provided")
        const matchesReason = selectedReasons.length === 0 || selectedReasons.includes(reason)
        
        const matchesSource = selectedSources.length === 0 || selectedSources.includes(safeString(booking.source))
        
        const status = isNoShow ? "no-show" : "cancelled"
        const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(status)
        
        return inDateRange && matchesSite && matchesReason && matchesSource && matchesStatus
      })
    } catch (error) {
      console.error("Error filtering cancellations/no-shows:", error)
      return []
    }
  }, [bookings, startDate, endDate, selectedSites, selectedReasons, selectedSources, selectedStatuses, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const metrics = useMemo(() => {
    const totalCancellations = filteredBookings.filter((b: any) => b.status === "cancelled").length
    const totalNoShows = filteredBookings.filter((b: any) => b.tracking === "No Show" || b.status === "no-show").length
    const totalLoss = totalCancellations + totalNoShows
    
    const bookingValueLost = filteredBookings.reduce((sum: number, booking: any) => 
      sum + (booking.totalAmount || booking.deposit || 0), 0
    )
    
    const coversLost = filteredBookings.reduce((sum: number, booking: any) => 
      sum + (booking.guests || booking.covers || booking.guestCount || 0), 0
    )
    
    const recoveredBookings = filteredBookings.filter((b: any) => b.rebooked || b.recovered).length
    const recoveryRate = totalLoss > 0 ? (recoveredBookings / totalLoss) * 100 : 0
    
    // Calculate lead time for cancellations
    const cancellationLeadTimes = filteredBookings
      .filter((b: any) => b.status === "cancelled" && b.cancelledAt)
      .map((booking: any) => {
        const bookingDate = parseISO(booking.date)
        const cancelledDate = parseISO(booking.cancelledAt)
        return differenceInDays(bookingDate, cancelledDate)
      })
    
    const avgCancellationLeadTime = cancellationLeadTimes.length > 0 
      ? cancellationLeadTimes.reduce((sum: number, time: number) => sum + time, 0) / cancellationLeadTimes.length 
      : 0
    
    // Reason breakdown
    const reasonBreakdown = filteredBookings.reduce((acc: any, booking: any) => {
      const reason = booking.cancellationReason || booking.notes || "No reason provided"
      if (!acc[reason]) acc[reason] = { count: 0, value: 0, covers: 0 }
      acc[reason].count += 1
      acc[reason].value += booking.totalAmount || booking.deposit || 0
      acc[reason].covers += booking.guests || booking.covers || booking.guestCount || 0
      return acc
    }, {})
    
    // Time-based analysis
    const cancellationsByTimeframe = {
      sameDay: filteredBookings.filter((b: any) => {
        if (!b.cancelledAt) return false
        const bookingDate = parseISO(b.date)
        const cancelledDate = parseISO(b.cancelledAt)
        return differenceInDays(bookingDate, cancelledDate) === 0
      }).length,
      within7Days: filteredBookings.filter((b: any) => {
        if (!b.cancelledAt) return false
        const bookingDate = parseISO(b.date)
        const cancelledDate = parseISO(b.cancelledAt)
        const diff = differenceInDays(bookingDate, cancelledDate)
        return diff > 0 && diff <= 7
      }).length,
      moreThan7Days: filteredBookings.filter((b: any) => {
        if (!b.cancelledAt) return false
        const bookingDate = parseISO(b.date)
        const cancelledDate = parseISO(b.cancelledAt)
        return differenceInDays(bookingDate, cancelledDate) > 7
      }).length,
    }

    return {
      totalCancellations,
      totalNoShows,
      totalLoss,
      bookingValueLost,
      coversLost,
      recoveredBookings,
      recoveryRate,
      avgCancellationLeadTime,
      reasonBreakdown,
      cancellationsByTimeframe,
    }
  }, [filteredBookings])

  const groupedData = useMemo(() => {
    if (groupBy === "none") return []

    const groups: Record<string, any> = {}

    filteredBookings.forEach((booking: any) => {
      let key = ""
      
      switch (groupBy) {
        case "reason":
          key = booking.cancellationReason || booking.notes || "No reason provided"
          break
        case "site":
          key = booking.siteId || "Unknown"
          break
        case "source":
          key = booking.source || "Unknown"
          break
        case "leadTime":
          if (!booking.cancelledAt) {
            key = "Unknown"
          } else {
            const bookingDate = parseISO(booking.date)
            const cancelledDate = parseISO(booking.cancelledAt)
            const days = differenceInDays(bookingDate, cancelledDate)
            if (days === 0) key = "Same day"
            else if (days <= 7) key = "1-7 days"
            else key = "7+ days"
          }
          break
      }

      if (!groups[key]) {
        groups[key] = {
          key,
          cancellations: 0,
          noShows: 0,
          total: 0,
          value: 0,
          covers: 0,
          recovered: 0,
        }
      }

      groups[key].total += 1
      
      if (booking.status === "cancelled") {
        groups[key].cancellations += 1
      }
      if (booking.tracking === "No Show" || booking.status === "no-show") {
        groups[key].noShows += 1
      }
      
      groups[key].value += booking.totalAmount || booking.deposit || 0
      groups[key].covers += booking.guests || booking.covers || booking.guestCount || 0
      
      if (booking.rebooked || booking.recovered) {
        groups[key].recovered += 1
      }
    })

    return Object.values(groups).map((group: any) => ({
      ...group,
      recoveryRate: group.total > 0 ? (group.recovered / group.total) * 100 : 0,
    })).sort((a: any, b: any) => b.total - a.total)
  }, [filteredBookings, groupBy])

  const topReasons = useMemo(() => {
    return Object.entries(metrics.reasonBreakdown)
      .map(([reason, data]: [string, any]) => ({ reason, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [metrics.reasonBreakdown])

  const siteFilterOptions = useMemo(() => 
    sites.map((site: any) => ({ id: site.id, name: site.name })),
    [sites]
  )

  const reasonOptions = useMemo(() => {
    const reasons = new Set<string>()
    bookings.forEach((b: any) => {
      const reason = b.cancellationReason || b.notes
      if (reason) reasons.add(reason)
    })
    return Array.from(reasons).map(reason => ({ id: reason, name: reason }))
  }, [bookings])

  const sourceOptions = useMemo(() => [
    { id: "website", name: "Website" },
    { id: "phone", name: "Phone" },
    { id: "walk-in", name: "Walk-in" },
    { id: "partner", name: "Partner" },
    { id: "social", name: "Social Media" },
  ], [])

  const statusOptions = useMemo(() => [
    { id: "cancelled", name: "Cancelled" },
    { id: "no-show", name: "No-show" },
  ], [])

  const groupByOptions = useMemo(() => [
    { value: "none", label: "No Grouping" },
    { value: "reason", label: "By Reason" },
    { value: "site", label: "By Site" },
    { value: "source", label: "By Source" },
    { value: "leadTime", label: "By Lead Time" },
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
            label: "Reason",
            options: reasonOptions,
            selectedValues: selectedReasons,
            onSelectionChange: setSelectedReasons,
          },
          {
            label: "Source",
            options: sourceOptions,
            selectedValues: selectedSources,
            onSelectionChange: setSelectedSources,
          },
          {
            label: "Status",
            options: statusOptions,
            selectedValues: selectedStatuses,
            onSelectionChange: setSelectedStatuses,
          },
        ]}
        groupByOptions={groupByOptions}
        groupByValue={groupBy}
        onGroupByChange={(value) => setGroupBy(value as GroupByType)}
        onExportCSV={() => exportReportContainerToCsv(reportRef.current, "cancellations-no-show-report.csv")}
        onExportPDF={() => exportReportContainerToPdf(reportRef.current, "Cancellations and No-show Report", "cancellations-no-show-report.pdf")}
      />

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Cancellations</Typography>
              <Typography variant="h5" color="error">{metrics.totalCancellations}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total No-shows</Typography>
              <Typography variant="h5" color="warning.main">{metrics.totalNoShows}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Loss</Typography>
              <Typography variant="h5">{metrics.totalLoss}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Value Lost</Typography>
              <Typography variant="h5" color="error">£{metrics.bookingValueLost.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Covers Lost</Typography>
              <Typography variant="h6">{metrics.coversLost}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Recovered Bookings</Typography>
              <Typography variant="h6" color="success.main">{metrics.recoveredBookings}</Typography>
              <Typography variant="caption" color="text.secondary">
                {metrics.recoveryRate.toFixed(1)}% recovery rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Avg Cancellation Lead Time</Typography>
              <Typography variant="h6">{metrics.avgCancellationLeadTime.toFixed(0)} days</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Cancellation Timeframe Breakdown */}
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Cancellation Timeframe</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="caption">Same Day</Typography>
              <Typography variant="h6" color="error">{metrics.cancellationsByTimeframe.sameDay}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="caption">1-7 Days</Typography>
              <Typography variant="h6" color="warning.main">{metrics.cancellationsByTimeframe.within7Days}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="caption">7+ Days</Typography>
              <Typography variant="h6" color="success.main">{metrics.cancellationsByTimeframe.moreThan7Days}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Top Cancellation Reasons */}
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Top Cancellation/No-show Reasons</Typography>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Reason</TableCell>
              <TableCell align="right">Count</TableCell>
              <TableCell align="right">Covers Lost</TableCell>
              <TableCell align="right">Value Lost</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {topReasons.map((reason, index) => (
              <TableRow key={index}>
                <TableCell>{reason.reason}</TableCell>
                <TableCell align="right"><strong>{reason.count}</strong></TableCell>
                <TableCell align="right">{reason.covers}</TableCell>
                <TableCell align="right"><strong>£{reason.value.toFixed(2)}</strong></TableCell>
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
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">Cancellations</TableCell>
                  <TableCell align="right">No-shows</TableCell>
                  <TableCell align="right">Covers Lost</TableCell>
                  <TableCell align="right">Value Lost</TableCell>
                  <TableCell align="right">Recovered</TableCell>
                  <TableCell align="right">Recovery %</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupedData.map((row: any) => (
                  <TableRow key={row.key}>
                    <TableCell>{row.key}</TableCell>
                    <TableCell align="right"><strong>{row.total}</strong></TableCell>
                    <TableCell align="right">
                      <Chip label={row.cancellations} size="small" color="error" />
                    </TableCell>
                    <TableCell align="right">
                      <Chip label={row.noShows} size="small" color="warning" />
                    </TableCell>
                    <TableCell align="right">{row.covers}</TableCell>
                    <TableCell align="right"><strong>£{row.value.toFixed(2)}</strong></TableCell>
                    <TableCell align="right">
                      <Chip label={row.recovered} size="small" color={row.recovered > 0 ? "success" : "default"} />
                    </TableCell>
                    <TableCell align="right">{row.recoveryRate.toFixed(1)}%</TableCell>
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

export default CancellationsNoShowReport

