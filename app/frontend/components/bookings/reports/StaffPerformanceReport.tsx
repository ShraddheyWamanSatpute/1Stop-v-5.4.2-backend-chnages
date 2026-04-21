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

type GroupByType = "none" | "staff" | "site" | "source"

const StaffPerformanceReport: React.FC<BookingsReportProps> = ({ headerControls }) => {
  const reportRef = useRef<HTMLDivElement | null>(null)
  const { bookings = [], companyState } = useBookingsReportContext()
  const { sites = [] } = companyState

  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("week")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [customStartDate, setCustomStartDate] = useState<Date>(new Date(new Date().setDate(new Date().getDate() - 7)))
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date())
  const [groupBy, setGroupBy] = useState<GroupByType>("staff")
  const [selectedSites, setSelectedSites] = useState<string[]>([])
  const [selectedStaff, setSelectedStaff] = useState<string[]>([])
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
        if (!booking.date) return false
        
        const inDateRange = isDateInRange(booking.date, startDate, endDate)
        const matchesSite = selectedSites.length === 0 || selectedSites.includes(safeString(booking.siteId))
        const staffMember = safeString(booking.createdBy || booking.managedBy || booking.seatedBy)
        const matchesStaff = selectedStaff.length === 0 || selectedStaff.includes(staffMember)
        const matchesSource = selectedSources.length === 0 || selectedSources.includes(safeString(booking.source))
        
        return inDateRange && matchesSite && matchesStaff && matchesSource
      })
    } catch (error) {
      console.error("Error filtering bookings:", error)
      return []
    }
  }, [bookings, startDate, endDate, selectedSites, selectedStaff, selectedSources, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const metrics = useMemo(() => {
    // Group by staff member
    const staffPerformance: Record<string, any> = {}
    
    filteredBookings.forEach((booking: any) => {
      const staffMember = booking.createdBy || booking.managedBy || booking.seatedBy || "Unknown"
      
      if (!staffPerformance[staffMember]) {
        staffPerformance[staffMember] = {
          enquiries: 0,
          confirmed: 0,
          cancelled: 0,
          noShows: 0,
          totalCovers: 0,
          totalValue: 0,
          bookingsManaged: 0,
        }
      }
      
      staffPerformance[staffMember].bookingsManaged += 1
      
      if (booking.status === "enquiry" || booking.status === "pending") {
        staffPerformance[staffMember].enquiries += 1
      }
      if (booking.status === "confirmed" || booking.status === "completed") {
        staffPerformance[staffMember].confirmed += 1
      }
      if (booking.status === "cancelled") {
        staffPerformance[staffMember].cancelled += 1
      }
      if (booking.tracking === "No Show" || booking.status === "no-show") {
        staffPerformance[staffMember].noShows += 1
      }
      
      staffPerformance[staffMember].totalCovers += booking.guests || booking.covers || booking.guestCount || 0
      staffPerformance[staffMember].totalValue += booking.totalAmount || 0
    })
    
    // Calculate derived metrics
    Object.keys(staffPerformance).forEach(staff => {
      const data = staffPerformance[staff]
      data.conversionRate = data.enquiries > 0 ? (data.confirmed / data.enquiries) * 100 : 0
      data.avgCovers = data.bookingsManaged > 0 ? data.totalCovers / data.bookingsManaged : 0
      data.avgValue = data.bookingsManaged > 0 ? data.totalValue / data.bookingsManaged : 0
    })
    
    return staffPerformance
  }, [filteredBookings])

  const staffLeaderboard = useMemo(() => {
    return Object.entries(metrics)
      .map(([staff, data]) => ({
        staff,
        ...data,
      }))
      .sort((a, b) => b.confirmed - a.confirmed)
  }, [metrics])

  const groupedData = useMemo(() => {
    if (groupBy === "none") return []

    const groups: Record<string, any> = {}

    filteredBookings.forEach((booking: any) => {
      let key = ""
      
      switch (groupBy) {
        case "staff":
          key = booking.createdBy || booking.managedBy || booking.seatedBy || "Unknown"
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
          enquiries: 0,
          confirmed: 0,
          cancelled: 0,
          noShows: 0,
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
      if (booking.tracking === "No Show" || booking.status === "no-show") {
        groups[key].noShows += 1
      }
      
      groups[key].covers += booking.guests || booking.covers || booking.guestCount || 0
      groups[key].value += booking.totalAmount || 0
    })

    return Object.values(groups).map((group: any) => ({
      ...group,
      conversionRate: group.enquiries > 0 ? (group.confirmed / group.enquiries) * 100 : 0,
      avgCovers: group.bookings > 0 ? group.covers / group.bookings : 0,
      avgValue: group.bookings > 0 ? group.value / group.bookings : 0,
    })).sort((a: any, b: any) => b.confirmed - a.confirmed)
  }, [filteredBookings, groupBy])

  const siteFilterOptions = useMemo(() => 
    sites.map((site: any) => ({ id: site.id, name: site.name })),
    [sites]
  )

  const staffOptions = useMemo(() => {
    const staffMembers = new Set<string>()
    bookings.forEach((b: any) => {
      const staff = b.createdBy || b.managedBy || b.seatedBy
      if (staff) staffMembers.add(staff)
    })
    return Array.from(staffMembers).map(staff => ({ id: staff, name: staff }))
  }, [bookings])

  const sourceOptions = useMemo(() => [
    { id: "website", name: "Website" },
    { id: "phone", name: "Phone" },
    { id: "walk-in", name: "Walk-in" },
    { id: "partner", name: "Partner" },
    { id: "social", name: "Social Media" },
  ], [])

  const groupByOptions = useMemo(() => [
    { value: "none", label: "No Grouping" },
    { value: "staff", label: "By Staff" },
    { value: "site", label: "By Site" },
    { value: "source", label: "By Source" },
  ], [])

  // Calculate totals
  const totals = useMemo(() => {
    return staffLeaderboard.reduce((acc, staff) => {
      acc.bookingsManaged += staff.bookingsManaged
      acc.enquiries += staff.enquiries
      acc.confirmed += staff.confirmed
      acc.cancelled += staff.cancelled
      acc.noShows += staff.noShows
      acc.totalCovers += staff.totalCovers
      acc.totalValue += staff.totalValue
      return acc
    }, {
      bookingsManaged: 0,
      enquiries: 0,
      confirmed: 0,
      cancelled: 0,
      noShows: 0,
      totalCovers: 0,
      totalValue: 0,
    })
  }, [staffLeaderboard])

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
            label: "Staff Member",
            options: staffOptions,
            selectedValues: selectedStaff,
            onSelectionChange: setSelectedStaff,
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
        onExportCSV={() => exportReportContainerToCsv(reportRef.current, "staff-performance-report.csv")}
        onExportPDF={() => exportReportContainerToPdf(reportRef.current, "Staff Performance Report", "staff-performance-report.pdf")}
      />

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Bookings Managed</Typography>
              <Typography variant="h5">{totals.bookingsManaged}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Confirmed</Typography>
              <Typography variant="h5" color="success.main">{totals.confirmed}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Covers Booked</Typography>
              <Typography variant="h5">{totals.totalCovers}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Value</Typography>
              <Typography variant="h5">£{totals.totalValue.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Staff Performance Leaderboard */}
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Staff Performance Leaderboard</Typography>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Staff Member</TableCell>
              <TableCell align="right">Bookings Managed</TableCell>
              <TableCell align="right">Enquiries</TableCell>
              <TableCell align="right">Confirmed</TableCell>
              <TableCell align="right">Conversion %</TableCell>
              <TableCell align="right">Cancelled</TableCell>
              <TableCell align="right">No-shows</TableCell>
              <TableCell align="right">Total Covers</TableCell>
              <TableCell align="right">Avg Value</TableCell>
              <TableCell align="right">Total Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {staffLeaderboard.map((staff, index) => (
              <TableRow key={index}>
                <TableCell>
                  <strong>{staff.staff}</strong>
                  {index < 3 && (
                    <Chip 
                      label={`#${index + 1}`} 
                      size="small" 
                      color={index === 0 ? "success" : index === 1 ? "primary" : "secondary"}
                      sx={{ ml: 1 }}
                    />
                  )}
                </TableCell>
                <TableCell align="right"><strong>{staff.bookingsManaged}</strong></TableCell>
                <TableCell align="right">{staff.enquiries}</TableCell>
                <TableCell align="right">
                  <Chip label={staff.confirmed} size="small" color="success" />
                </TableCell>
                <TableCell align="right">
                  <strong style={{ color: staff.conversionRate > 70 ? "#4caf50" : "#ff9800" }}>
                    {staff.conversionRate.toFixed(1)}%
                  </strong>
                </TableCell>
                <TableCell align="right">
                  <Chip 
                    label={staff.cancelled} 
                    size="small" 
                    color={staff.cancelled > 5 ? "error" : "default"}
                  />
                </TableCell>
                <TableCell align="right">
                  <Chip 
                    label={staff.noShows} 
                    size="small" 
                    color={staff.noShows > 5 ? "warning" : "default"}
                  />
                </TableCell>
                <TableCell align="right">{staff.totalCovers}</TableCell>
                <TableCell align="right">£{staff.avgValue.toFixed(2)}</TableCell>
                <TableCell align="right"><strong>£{staff.totalValue.toFixed(2)}</strong></TableCell>
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
                  <TableCell align="right">Bookings</TableCell>
                  <TableCell align="right">Enquiries</TableCell>
                  <TableCell align="right">Confirmed</TableCell>
                  <TableCell align="right">Conversion %</TableCell>
                  <TableCell align="right">Cancelled</TableCell>
                  <TableCell align="right">No-shows</TableCell>
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
                    <TableCell align="right">{row.cancelled}</TableCell>
                    <TableCell align="right">{row.noShows}</TableCell>
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

export default StaffPerformanceReport

