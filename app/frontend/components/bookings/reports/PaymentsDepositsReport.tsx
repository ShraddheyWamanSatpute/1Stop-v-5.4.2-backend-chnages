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
  safeString,
  safeNumber 
} from "../../../utils/reportHelpers"
import { exportReportContainerToCsv, exportReportContainerToPdf } from "../../../utils/reportExport"
import type { BookingsReportProps } from "./reportTypes"

type GroupByType = "none" | "site" | "paymentType" | "paymentMethod" | "status"

const PaymentsDepositsReport: React.FC<BookingsReportProps> = ({ headerControls }) => {
  const reportRef = useRef<HTMLDivElement | null>(null)
  const { bookings = [], companyState } = useBookingsReportContext()
  const { sites = [] } = companyState

  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("week")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [customStartDate, setCustomStartDate] = useState<Date>(new Date(new Date().setDate(new Date().getDate() - 7)))
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date())
  const [groupBy, setGroupBy] = useState<GroupByType>("none")
  const [selectedSites, setSelectedSites] = useState<string[]>([])
  const [selectedPaymentTypes, setSelectedPaymentTypes] = useState<string[]>([])
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([])
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
        
        const inDateRange = isDateInRange(booking.date, startDate, endDate)
        const matchesSite = selectedSites.length === 0 || selectedSites.includes(safeString(booking.siteId))
        
        const paymentType = booking.depositRequired ? "deposit" : safeNumber(booking.totalAmount, 0) > 0 ? "full" : "none"
        const matchesPaymentType = selectedPaymentTypes.length === 0 || selectedPaymentTypes.includes(paymentType)
        
        const paymentMethod = safeString(booking.paymentMethod, "unknown")
        const matchesPaymentMethod = selectedPaymentMethods.length === 0 || selectedPaymentMethods.includes(paymentMethod)
        
        const paymentStatus = booking.depositPaid ? "paid" : safeNumber(booking.deposit, 0) > 0 ? "pending" : "unpaid"
        const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(paymentStatus)
        
        return inDateRange && matchesSite && matchesPaymentType && matchesPaymentMethod && matchesStatus
      })
    } catch (error) {
      console.error("Error filtering bookings:", error)
      return []
    }
  }, [bookings, startDate, endDate, selectedSites, selectedPaymentTypes, selectedPaymentMethods, selectedStatuses, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const metrics = useMemo(() => {
    const totalBookings = filteredBookings.length
    const depositsRequired = filteredBookings.filter((b: any) => b.deposit > 0 || b.depositRequired).length
    const depositsPaid = filteredBookings.filter((b: any) => b.depositPaid).length
    const depositsPending = depositsRequired - depositsPaid
    
    const totalDeposits = filteredBookings.reduce((sum: number, booking: any) => sum + (booking.deposit || 0), 0)
    const totalPaid = filteredBookings.reduce((sum: number, booking: any) => {
      if (booking.depositPaid || booking.status === "completed") {
        return sum + (booking.totalAmount || booking.deposit || 0)
      }
      return sum
    }, 0)
    
    const totalOutstanding = filteredBookings.reduce((sum: number, booking: any) => {
      if (!booking.depositPaid && booking.deposit > 0) {
        return sum + booking.deposit
      }
      if (booking.depositPaid && booking.totalAmount > booking.deposit) {
        return sum + (booking.totalAmount - booking.deposit)
      }
      return sum
    }, 0)
    
    const refunds = filteredBookings.filter((b: any) => b.refunded || b.status === "refunded").length
    const totalRefunded = filteredBookings.reduce((sum: number, booking: any) => {
      if (booking.refunded || booking.status === "refunded") {
        return sum + (booking.refundAmount || booking.deposit || booking.totalAmount || 0)
      }
      return sum
    }, 0)

    // Payment method breakdown
    const paymentMethodBreakdown = filteredBookings.reduce((acc: any, booking: any) => {
      const method = booking.paymentMethod || "unknown"
      if (!acc[method]) acc[method] = { count: 0, amount: 0 }
      acc[method].count += 1
      acc[method].amount += booking.totalAmount || booking.deposit || 0
      return acc
    }, {})

    return {
      totalBookings,
      depositsRequired,
      depositsPaid,
      depositsPending,
      totalDeposits,
      totalPaid,
      totalOutstanding,
      refunds,
      totalRefunded,
      paymentMethodBreakdown,
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
        case "paymentType":
          key = booking.depositRequired ? "Deposit" : booking.totalAmount > 0 ? "Full Payment" : "No Payment"
          break
        case "paymentMethod":
          key = booking.paymentMethod || "Unknown"
          break
        case "status":
          key = booking.depositPaid ? "Paid" : booking.deposit > 0 ? "Pending" : "Unpaid"
          break
      }

      if (!groups[key]) {
        groups[key] = {
          key,
          bookings: 0,
          paid: 0,
          pending: 0,
          refunded: 0,
          totalAmount: 0,
          deposits: 0,
          outstanding: 0,
        }
      }

      groups[key].bookings += 1
      groups[key].totalAmount += booking.totalAmount || booking.deposit || 0
      groups[key].deposits += booking.deposit || 0
      
      if (booking.depositPaid || booking.status === "completed") {
        groups[key].paid += 1
      } else if (booking.deposit > 0) {
        groups[key].pending += 1
        groups[key].outstanding += booking.deposit
      }
      
      if (booking.refunded || booking.status === "refunded") {
        groups[key].refunded += 1
      }
    })

    return Object.values(groups).sort((a: any, b: any) => b.totalAmount - a.totalAmount)
  }, [filteredBookings, groupBy])

  const siteFilterOptions = useMemo(() => 
    sites.map((site: any) => ({ id: site.id, name: site.name })),
    [sites]
  )

  const paymentTypeOptions = useMemo(() => [
    { id: "deposit", name: "Deposit" },
    { id: "full", name: "Full Payment" },
    { id: "preorder", name: "Preorder" },
  ], [])

  const paymentMethodOptions = useMemo(() => [
    { id: "card", name: "Card" },
    { id: "cash", name: "Cash" },
    { id: "online", name: "Online" },
    { id: "voucher", name: "Voucher" },
    { id: "bank", name: "Bank Transfer" },
  ], [])

  const statusOptions = useMemo(() => [
    { id: "paid", name: "Paid" },
    { id: "pending", name: "Pending" },
    { id: "unpaid", name: "Unpaid" },
    { id: "refunded", name: "Refunded" },
  ], [])

  const groupByOptions = useMemo(() => [
    { value: "none", label: "No Grouping" },
    { value: "site", label: "By Site" },
    { value: "paymentType", label: "By Payment Type" },
    { value: "paymentMethod", label: "By Payment Method" },
    { value: "status", label: "By Status" },
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
            label: "Payment Type",
            options: paymentTypeOptions,
            selectedValues: selectedPaymentTypes,
            onSelectionChange: setSelectedPaymentTypes,
          },
          {
            label: "Payment Method",
            options: paymentMethodOptions,
            selectedValues: selectedPaymentMethods,
            onSelectionChange: setSelectedPaymentMethods,
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
        onExportCSV={() => exportReportContainerToCsv(reportRef.current, "payments-deposits-report.csv")}
        onExportPDF={() => exportReportContainerToPdf(reportRef.current, "Payments and Deposits Report", "payments-deposits-report.pdf")}
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
              <Typography color="text.secondary" gutterBottom variant="caption">Total Paid</Typography>
              <Typography variant="h5" color="success.main">£{metrics.totalPaid.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Outstanding</Typography>
              <Typography variant="h5" color="warning.main">£{metrics.totalOutstanding.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Refunded</Typography>
              <Typography variant="h5" color="error">£{metrics.totalRefunded.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Deposits Required</Typography>
              <Typography variant="h6">{metrics.depositsRequired}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Deposits Paid</Typography>
              <Typography variant="h6" color="success.main">{metrics.depositsPaid}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Deposits Pending</Typography>
              <Typography variant="h6" color="warning.main">{metrics.depositsPending}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Deposits</Typography>
              <Typography variant="h6">£{metrics.totalDeposits.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Refunds</Typography>
              <Typography variant="h6">{metrics.refunds}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Payment Method Breakdown */}
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Payment Method Breakdown</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Object.entries(metrics.paymentMethodBreakdown).map(([method, data]: [string, any]) => (
          <Grid item xs={6} sm={4} md={2.4} key={method}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="caption">{method}</Typography>
                <Typography variant="h6">£{data.amount.toFixed(2)}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {data.count} transactions
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
                  <TableCell align="right">Paid</TableCell>
                  <TableCell align="right">Pending</TableCell>
                  <TableCell align="right">Refunded</TableCell>
                  <TableCell align="right">Total Amount</TableCell>
                  <TableCell align="right">Deposits</TableCell>
                  <TableCell align="right">Outstanding</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupedData.map((row: any) => (
                  <TableRow key={row.key}>
                    <TableCell>{row.key}</TableCell>
                    <TableCell align="right">{row.bookings}</TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={row.paid} 
                        size="small" 
                        color="success"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={row.pending} 
                        size="small" 
                        color={row.pending > 0 ? "warning" : "default"}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={row.refunded} 
                        size="small" 
                        color={row.refunded > 0 ? "error" : "default"}
                      />
                    </TableCell>
                    <TableCell align="right"><strong>£{row.totalAmount.toFixed(2)}</strong></TableCell>
                    <TableCell align="right">£{row.deposits.toFixed(2)}</TableCell>
                    <TableCell align="right">
                      <strong style={{ color: row.outstanding > 0 ? "#f44336" : "inherit" }}>
                        £{row.outstanding.toFixed(2)}
                      </strong>
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

export default PaymentsDepositsReport

