"use client"

import React, { useState, useMemo } from "react"
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
} from "@mui/material"
import { usePOSReportContext } from "../../../../backend/context/AnalyticsContext"
import DataHeader from "../../reusable/DataHeader"
import { format, getHours, subDays, parseISO } from "date-fns"
import { 
  calculateDateRange, 
  filterByCompanyContext, 
  isDateInRange, 
  safeArray,
  safeNumber 
} from "../../../utils/reportHelpers"

type GroupByType = "none" | "site" | "till" | "area" | "hour" | "day" | "paymentType"

const SalesSummaryReport: React.FC = () => {
  const { posState, companyState } = usePOSReportContext()
  const { bills = [] } = posState || {}
  const { sites = [] } = companyState

  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("week")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [customStartDate, setCustomStartDate] = useState<Date>(subDays(new Date(), 7))
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date())
  const [groupBy, setGroupBy] = useState<GroupByType>("none")
  const [selectedSites, setSelectedSites] = useState<string[]>([])
  const [selectedTransactionTypes, setSelectedTransactionTypes] = useState<string[]>([])

  const { startDate, endDate } = useMemo(() => {
    return calculateDateRange(dateType, currentDate, customStartDate, customEndDate)
  }, [dateType, currentDate, customStartDate, customEndDate])

  const filteredBills = useMemo(() => {
    try {
      // Filter bills by company context first
      const contextFilteredBills = filterByCompanyContext(
        safeArray(bills),
        companyState.selectedSiteID,
        companyState.selectedSubsiteID
      )
      
      return contextFilteredBills.filter((bill: any) => {
        if (!bill.date && !bill.timestamp) return false
        
        // Use safe date checking
        if (!isDateInRange(bill.date || bill.timestamp, startDate, endDate)) return false
        
        const matchesSite = selectedSites.length === 0 || selectedSites.includes(bill.siteId)
        const matchesType = selectedTransactionTypes.length === 0 ||
          selectedTransactionTypes.some(type => {
            if (type === "sale") return bill.status !== "void" && bill.status !== "refund"
            if (type === "void") return bill.status === "void"
            if (type === "refund") return bill.status === "refund"
            return false
          })
        
        return matchesSite && matchesType
      })
    } catch (error) {
      console.error("Error filtering bills:", error)
      return []
    }
  }, [bills, startDate, endDate, selectedSites, selectedTransactionTypes, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const metrics = useMemo(() => {
    try {
      const grossSales = filteredBills.reduce((sum: number, bill: any) => sum + safeNumber(bill.subtotal, 0), 0)
      const discounts = filteredBills.reduce((sum: number, bill: any) => sum + safeNumber(bill.discount, 0), 0)
      const tax = filteredBills.reduce((sum: number, bill: any) => sum + safeNumber(bill.tax, 0), 0)
      const serviceCharge = filteredBills.reduce((sum: number, bill: any) => sum + safeNumber(bill.serviceCharge, 0), 0)
      const netSales = filteredBills.reduce((sum: number, bill: any) => sum + safeNumber(bill.total, 0), 0)
    
      const voidsBills = filteredBills.filter((b: any) => b.status === "void")
      const voidsValue = voidsBills.reduce((sum: number, bill: any) => sum + safeNumber(bill.total, 0), 0)
      
      const refundsBills = filteredBills.filter((b: any) => b.status === "refund")
      const refundsValue = refundsBills.reduce((sum: number, bill: any) => sum + safeNumber(bill.total, 0), 0)
      
      const totalItems = filteredBills.reduce((sum: number, bill: any) => {
        return sum + safeArray(bill.items).length
      }, 0)

      const paymentBreakdown = filteredBills.reduce((acc: any, bill: any) => {
        const method = bill.paymentMethod || "unknown"
        if (!acc[method]) acc[method] = 0
        acc[method] += safeNumber(bill.total, 0)
        return acc
      }, {})

      const tips = filteredBills.reduce((sum: number, bill: any) => sum + safeNumber(bill.tip, 0), 0)

      return {
        grossSales,
        netSales,
        discounts,
        tax,
        serviceCharge,
        voidsValue,
        voidsCount: voidsBills.length,
        refundsValue,
        refundsCount: refundsBills.length,
        totalTransactions: filteredBills.length,
        averageSpend: filteredBills.length > 0 ? netSales / filteredBills.length : 0,
        totalItems,
        averageItemsPerTransaction: filteredBills.length > 0 ? totalItems / filteredBills.length : 0,
        paymentBreakdown,
        tips,
        cashTotal: safeNumber(paymentBreakdown.cash, 0),
        cardTotal: safeNumber(paymentBreakdown.card, 0),
        voucherTotal: safeNumber(paymentBreakdown.voucher, 0),
        giftCardTotal: safeNumber(paymentBreakdown.giftCard, 0),
        onlineTotal: safeNumber(paymentBreakdown.online, 0),
      }
    } catch (error) {
      console.error("Error calculating metrics:", error)
      return {
        grossSales: 0,
        netSales: 0,
        discounts: 0,
        tax: 0,
        serviceCharge: 0,
        voidsValue: 0,
        voidsCount: 0,
        refundsValue: 0,
        refundsCount: 0,
        totalTransactions: 0,
        averageSpend: 0,
        totalItems: 0,
        averageItemsPerTransaction: 0,
        paymentBreakdown: {},
        tips: 0,
        cashTotal: 0,
        cardTotal: 0,
        voucherTotal: 0,
        giftCardTotal: 0,
        onlineTotal: 0,
      }
    }
  }, [filteredBills])

  const groupedData = useMemo(() => {
    if (groupBy === "none") return []

    const groups: Record<string, any> = {}

    filteredBills.forEach((bill: any) => {
      let key = ""
      
      switch (groupBy) {
        case "site":
          key = bill.siteId || "Unknown"
          break
        case "till":
          key = bill.tillId || "Unknown"
          break
        case "area":
          key = bill.area || "Unknown"
          break
        case "hour":
          const billDate = parseISO(bill.date || bill.timestamp)
          key = `${getHours(billDate)}:00`
          break
        case "day":
          key = format(parseISO(bill.date || bill.timestamp), "yyyy-MM-dd")
          break
        case "paymentType":
          key = bill.paymentMethod || "Unknown"
          break
      }

      if (!groups[key]) {
        groups[key] = {
          key,
          transactions: 0,
          grossSales: 0,
          netSales: 0,
          discounts: 0,
          tax: 0,
          items: 0,
        }
      }

      groups[key].transactions += 1
      groups[key].grossSales += bill.subtotal || 0
      groups[key].netSales += bill.total || 0
      groups[key].discounts += bill.discount || 0
      groups[key].tax += bill.tax || 0
      groups[key].items += bill.items?.length || 0
    })

    return Object.values(groups).sort((a: any, b: any) => b.netSales - a.netSales)
  }, [filteredBills, groupBy])

  const siteFilterOptions = useMemo(() => 
    sites.map((site: any) => ({ id: site.id, name: site.name })),
    [sites]
  )

  const transactionTypeOptions = useMemo(() => [
    { id: "sale", name: "Sales" },
    { id: "void", name: "Voids" },
    { id: "refund", name: "Refunds" },
  ], [])

  const groupByOptions = useMemo(() => [
    { value: "none", label: "No Grouping" },
    { value: "site", label: "By Site" },
    { value: "till", label: "By Till" },
    { value: "area", label: "By Area" },
    { value: "hour", label: "By Hour" },
    { value: "day", label: "By Day" },
    { value: "paymentType", label: "By Payment Type" },
  ], [])

  return (
    <Box>
      <DataHeader
        showDateControls={true}
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        dateType={dateType}
        onDateTypeChange={setDateType}
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
            label: "Transaction Type",
            options: transactionTypeOptions,
            selectedValues: selectedTransactionTypes,
            onSelectionChange: setSelectedTransactionTypes,
          },
        ]}
        groupByOptions={groupByOptions}
        groupByValue={groupBy}
        onGroupByChange={(value) => setGroupBy(value as GroupByType)}
        onExportCSV={() => console.log("Export CSV")}
        onExportPDF={() => console.log("Export PDF")}
      />

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Gross Sales</Typography>
              <Typography variant="h5">£{metrics.grossSales.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Net Sales</Typography>
              <Typography variant="h5">£{metrics.netSales.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Transactions</Typography>
              <Typography variant="h5">{metrics.totalTransactions}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Average Spend</Typography>
              <Typography variant="h5">£{metrics.averageSpend.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Discounts</Typography>
              <Typography variant="h6" color="error">-£{metrics.discounts.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Tax</Typography>
              <Typography variant="h6">£{metrics.tax.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Service Charge</Typography>
              <Typography variant="h6">£{metrics.serviceCharge.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Voids</Typography>
              <Typography variant="h6" color="warning.main">{metrics.voidsCount} (£{metrics.voidsValue.toFixed(2)})</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Refunds</Typography>
              <Typography variant="h6" color="warning.main">{metrics.refundsCount} (£{metrics.refundsValue.toFixed(2)})</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Payment Breakdown */}
      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Payment Breakdown</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="caption">Cash</Typography>
              <Typography variant="h6">£{metrics.cashTotal.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="caption">Card</Typography>
              <Typography variant="h6">£{metrics.cardTotal.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="caption">Voucher</Typography>
              <Typography variant="h6">£{metrics.voucherTotal.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="caption">Gift Card</Typography>
              <Typography variant="h6">£{metrics.giftCardTotal.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="caption">Online</Typography>
              <Typography variant="h6">£{metrics.onlineTotal.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="caption">Tips</Typography>
              <Typography variant="h6">£{metrics.tips.toFixed(2)}</Typography>
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
                  <TableCell align="right">Transactions</TableCell>
                  <TableCell align="right">Gross Sales</TableCell>
                  <TableCell align="right">Discounts</TableCell>
                  <TableCell align="right">Tax</TableCell>
                  <TableCell align="right">Net Sales</TableCell>
                  <TableCell align="right">Avg Transaction</TableCell>
                  <TableCell align="right">Items</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupedData.map((row: any) => (
                  <TableRow key={row.key}>
                    <TableCell>{row.key}</TableCell>
                    <TableCell align="right">{row.transactions}</TableCell>
                    <TableCell align="right">£{row.grossSales.toFixed(2)}</TableCell>
                    <TableCell align="right">-£{row.discounts.toFixed(2)}</TableCell>
                    <TableCell align="right">£{row.tax.toFixed(2)}</TableCell>
                    <TableCell align="right"><strong>£{row.netSales.toFixed(2)}</strong></TableCell>
                    <TableCell align="right">£{(row.netSales / row.transactions).toFixed(2)}</TableCell>
                    <TableCell align="right">{row.items}</TableCell>
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

export default SalesSummaryReport
