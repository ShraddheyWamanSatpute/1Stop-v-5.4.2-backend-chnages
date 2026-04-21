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

type GroupByType = "none" | "site" | "menuType" | "status" | "bookingStatus"

const PreordersPackagesReport: React.FC<BookingsReportProps> = ({ headerControls }) => {
  const reportRef = useRef<HTMLDivElement | null>(null)
  const { bookings = [], companyState } = useBookingsReportContext()
  const { sites = [] } = companyState

  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("week")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [customStartDate, setCustomStartDate] = useState<Date>(new Date(new Date().setDate(new Date().getDate() - 7)))
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date())
  const [groupBy, setGroupBy] = useState<GroupByType>("none")
  const [selectedSites, setSelectedSites] = useState<string[]>([])
  const [selectedMenuTypes, setSelectedMenuTypes] = useState<string[]>([])
  const [selectedPaymentStatuses, setSelectedPaymentStatuses] = useState<string[]>([])
  const [selectedBookingStatuses, setSelectedBookingStatuses] = useState<string[]>([])

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
        // Only include bookings with preorders
        if (!booking.preorder && !booking.packages && !booking.preorderItems) return false
        
        if (!booking.date) return false
        
        const inDateRange = isDateInRange(booking.date, startDate, endDate)
        const matchesSite = selectedSites.length === 0 || selectedSites.includes(safeString(booking.siteId))
        
        const menuType = safeString(booking.preorder?.menuType || booking.packageType, "standard")
        const matchesMenuType = selectedMenuTypes.length === 0 || selectedMenuTypes.includes(menuType)
        
        const paymentStatus = safeString(booking.preorder?.paymentStatus || (booking.depositPaid ? "paid" : "pending"))
        const matchesPaymentStatus = selectedPaymentStatuses.length === 0 || selectedPaymentStatuses.includes(paymentStatus)
        
        const matchesBookingStatus = selectedBookingStatuses.length === 0 || selectedBookingStatuses.includes(safeString(booking.status))
        
        return inDateRange && matchesSite && matchesMenuType && matchesPaymentStatus && matchesBookingStatus
      })
    } catch (error) {
      console.error("Error filtering preorders/packages:", error)
      return []
    }
  }, [bookings, startDate, endDate, selectedSites, selectedMenuTypes, selectedPaymentStatuses, selectedBookingStatuses, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const metrics = useMemo(() => {
    const totalPreorders = filteredBookings.length
    
    const totalValue = filteredBookings.reduce((sum: number, booking: any) => {
      const preorderValue = booking.preorder?.totalAmount || booking.preorderValue || 0
      return sum + preorderValue
    }, 0)
    
    const avgValuePerBooking = totalPreorders > 0 ? totalValue / totalPreorders : 0
    
    const paid = filteredBookings.filter((b: any) => 
      b.preorder?.paymentStatus === "paid" || b.depositPaid
    ).length
    
    const pending = filteredBookings.filter((b: any) => 
      b.preorder?.paymentStatus === "pending" || (!b.depositPaid && b.deposit > 0)
    ).length
    
    const served = filteredBookings.filter((b: any) => 
      b.status === "completed" || b.preorder?.served
    ).length
    
    // Calculate items breakdown
    const itemsBreakdown: Record<string, { quantity: number, value: number }> = {}
    
    filteredBookings.forEach((booking: any) => {
      const items = booking.preorder?.items || booking.preorderItems || []
      items.forEach((item: any) => {
        const itemName = item.name || item.itemName || "Unknown"
        if (!itemsBreakdown[itemName]) {
          itemsBreakdown[itemName] = { quantity: 0, value: 0 }
        }
        itemsBreakdown[itemName].quantity += item.quantity || 1
        itemsBreakdown[itemName].value += (item.price || 0) * (item.quantity || 1)
      })
    })
    
    // Menu type breakdown
    const menuTypeBreakdown = filteredBookings.reduce((acc: any, booking: any) => {
      const menuType = booking.preorder?.menuType || booking.packageType || "standard"
      if (!acc[menuType]) acc[menuType] = { count: 0, value: 0 }
      acc[menuType].count += 1
      acc[menuType].value += booking.preorder?.totalAmount || booking.preorderValue || 0
      return acc
    }, {})

    return {
      totalPreorders,
      totalValue,
      avgValuePerBooking,
      paid,
      pending,
      served,
      itemsBreakdown,
      menuTypeBreakdown,
    }
  }, [filteredBookings])

  const groupedData = useMemo(() => {
    if (groupBy === "none") return []

    const groups: Record<string, any> = {}

    filteredBookings.forEach((booking: any) => {
      let key = ""
      
      switch (groupBy) {
        case "site":
          key = booking.siteId || "Unknown"
          break
        case "menuType":
          key = booking.preorder?.menuType || booking.packageType || "Standard"
          break
        case "status":
          key = booking.preorder?.paymentStatus || (booking.depositPaid ? "Paid" : "Pending")
          break
        case "bookingStatus":
          key = booking.status || "Unknown"
          break
      }

      if (!groups[key]) {
        groups[key] = {
          key,
          preorders: 0,
          value: 0,
          paid: 0,
          pending: 0,
          served: 0,
          items: 0,
        }
      }

      groups[key].preorders += 1
      groups[key].value += booking.preorder?.totalAmount || booking.preorderValue || 0
      
      if (booking.preorder?.paymentStatus === "paid" || booking.depositPaid) {
        groups[key].paid += 1
      } else {
        groups[key].pending += 1
      }
      
      if (booking.status === "completed" || booking.preorder?.served) {
        groups[key].served += 1
      }
      
      const items = booking.preorder?.items || booking.preorderItems || []
      groups[key].items += items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0)
    })

    return Object.values(groups).sort((a: any, b: any) => b.value - a.value)
  }, [filteredBookings, groupBy])

  const topItems = useMemo(() => {
    return Object.entries(metrics.itemsBreakdown)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)
  }, [metrics.itemsBreakdown])

  const siteFilterOptions = useMemo(() => 
    sites.map((site: any) => ({ id: site.id, name: site.name })),
    [sites]
  )

  const menuTypeOptions = useMemo(() => [
    { id: "standard", name: "Standard" },
    { id: "dinner", name: "Dinner" },
    { id: "drinks", name: "Drinks" },
    { id: "package", name: "Package" },
    { id: "event", name: "Event Menu" },
  ], [])

  const paymentStatusOptions = useMemo(() => [
    { id: "paid", name: "Paid" },
    { id: "pending", name: "Pending" },
  ], [])

  const bookingStatusOptions = useMemo(() => [
    { id: "confirmed", name: "Confirmed" },
    { id: "pending", name: "Pending" },
    { id: "completed", name: "Completed" },
    { id: "cancelled", name: "Cancelled" },
  ], [])

  const groupByOptions = useMemo(() => [
    { value: "none", label: "No Grouping" },
    { value: "site", label: "By Site" },
    { value: "menuType", label: "By Menu Type" },
    { value: "status", label: "By Payment Status" },
    { value: "bookingStatus", label: "By Booking Status" },
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
            label: "Menu Type",
            options: menuTypeOptions,
            selectedValues: selectedMenuTypes,
            onSelectionChange: setSelectedMenuTypes,
          },
          {
            label: "Payment Status",
            options: paymentStatusOptions,
            selectedValues: selectedPaymentStatuses,
            onSelectionChange: setSelectedPaymentStatuses,
          },
          {
            label: "Booking Status",
            options: bookingStatusOptions,
            selectedValues: selectedBookingStatuses,
            onSelectionChange: setSelectedBookingStatuses,
          },
        ]}
        groupByOptions={groupByOptions}
        groupByValue={groupBy}
        onGroupByChange={(value) => setGroupBy(value as GroupByType)}
        onExportCSV={() => exportReportContainerToCsv(reportRef.current, "preorders-packages-report.csv")}
        onExportPDF={() => exportReportContainerToPdf(reportRef.current, "Preorders and Packages Report", "preorders-packages-report.pdf")}
      />

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Preorders</Typography>
              <Typography variant="h5">{metrics.totalPreorders}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Value</Typography>
              <Typography variant="h5">£{metrics.totalValue.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Avg Value/Booking</Typography>
              <Typography variant="h5">£{metrics.avgValuePerBooking.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Served</Typography>
              <Typography variant="h5" color="success.main">{metrics.served}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={6}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Paid</Typography>
              <Typography variant="h6" color="success.main">{metrics.paid}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={6}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Pending</Typography>
              <Typography variant="h6" color="warning.main">{metrics.pending}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Menu Type Breakdown */}
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Menu Type Breakdown</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Object.entries(metrics.menuTypeBreakdown).map(([type, data]: [string, any]) => (
          <Grid item xs={6} sm={4} md={3} key={type}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="caption">{type}</Typography>
                <Typography variant="h6">£{data.value.toFixed(2)}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {data.count} orders
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Top 10 Preordered Items */}
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Top 10 Preordered Items</Typography>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell align="right">Quantity</TableCell>
              <TableCell align="right">Total Value</TableCell>
              <TableCell align="right">Avg Price</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {topItems.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.name}</TableCell>
                <TableCell align="right"><strong>{item.quantity}</strong></TableCell>
                <TableCell align="right">£{item.value.toFixed(2)}</TableCell>
                <TableCell align="right">£{(item.value / item.quantity).toFixed(2)}</TableCell>
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
                  <TableCell align="right">Preorders</TableCell>
                  <TableCell align="right">Total Items</TableCell>
                  <TableCell align="right">Value</TableCell>
                  <TableCell align="right">Paid</TableCell>
                  <TableCell align="right">Pending</TableCell>
                  <TableCell align="right">Served</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupedData.map((row: any) => (
                  <TableRow key={row.key}>
                    <TableCell>{row.key}</TableCell>
                    <TableCell align="right"><strong>{row.preorders}</strong></TableCell>
                    <TableCell align="right">{row.items}</TableCell>
                    <TableCell align="right"><strong>£{row.value.toFixed(2)}</strong></TableCell>
                    <TableCell align="right">
                      <Chip label={row.paid} size="small" color="success" />
                    </TableCell>
                    <TableCell align="right">
                      <Chip label={row.pending} size="small" color={row.pending > 0 ? "warning" : "default"} />
                    </TableCell>
                    <TableCell align="right">{row.served}</TableCell>
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

export default PreordersPackagesReport

