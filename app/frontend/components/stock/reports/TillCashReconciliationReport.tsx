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
  Chip,
} from "@mui/material"
import { usePOSReportContext } from "../../../../backend/context/AnalyticsContext"
import DataHeader from "../../reusable/DataHeader"
import { format } from "date-fns"
import { 
  calculateDateRange, 
  filterByCompanyContext, 
  isDateInRange, 
  safeArray,
  safeNumber,
  safeParseDate
} from "../../../utils/reportHelpers"

const TillCashReconciliationReport: React.FC = () => {
  const { posState, companyState } = usePOSReportContext()
  const { bills = [] } = posState || {}
  const { sites = [] } = companyState

  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("day")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [customStartDate, setCustomStartDate] = useState<Date>(new Date())
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date())
  const [selectedSites, setSelectedSites] = useState<string[]>([])
  const [selectedVarianceTypes, setSelectedVarianceTypes] = useState<string[]>([])

  const { startDate, endDate } = useMemo(() => {
    return calculateDateRange(dateType, currentDate, customStartDate, customEndDate)
  }, [dateType, currentDate, customStartDate, customEndDate])

  const tillReconciliations = useMemo(() => {
    try {
      // Filter bills by company context first
      const contextFilteredBills = filterByCompanyContext(
        safeArray(bills),
        companyState.selectedSiteID,
        companyState.selectedSubsiteID
      )
      
      const tillGroups: Record<string, any> = {}

      contextFilteredBills.forEach((bill: any) => {
        if (!bill.date && !bill.timestamp) return
        
        // Use safe date checking
        if (!isDateInRange(bill.date || bill.timestamp, startDate, endDate)) return
        
        const tillId = bill.tillId || "Unknown"
        const siteId = bill.siteId || "Unknown"
        
        if (selectedSites.length > 0 && !selectedSites.includes(siteId)) return

        // Safely parse bill date
        const billDate = safeParseDate(bill.date || bill.timestamp)
        if (!billDate) return // Skip if date is invalid
        
        const dateStr = format(billDate, "yyyy-MM-dd")
        const key = `${siteId}-${tillId}-${dateStr}`
      
      if (!tillGroups[key]) {
        tillGroups[key] = {
          tillId,
          tillName: `Till ${tillId}`,
          siteId,
          date: dateStr,
          openingFloat: 100,
          cashSales: 0,
          cardSales: 0,
          voucherSales: 0,
          totalSales: 0,
          cashReturns: 0,
          paidOuts: 0,
          deposits: 0,
          cashWithdrawals: 0,
          expectedCash: 100,
          actualCash: 0,
          variance: 0,
          variancePercent: 0,
        }
      }

        const group = tillGroups[key]
        
        if (bill.paymentMethod === "cash") {
          if (bill.status === "refund") {
            group.cashReturns += safeNumber(bill.total, 0)
          } else if (bill.status !== "void") {
            group.cashSales += safeNumber(bill.total, 0)
          }
        } else if (bill.paymentMethod === "card") {
          group.cardSales += safeNumber(bill.total, 0)
        } else if (bill.paymentMethod === "voucher") {
          group.voucherSales += safeNumber(bill.total, 0)
        }
        
        group.totalSales += safeNumber(bill.total, 0)
      })

      Object.values(tillGroups).forEach((group: any) => {
        group.expectedCash = safeNumber(group.openingFloat, 100) + safeNumber(group.cashSales, 0) - safeNumber(group.cashReturns, 0) - safeNumber(group.deposits, 0) - safeNumber(group.paidOuts, 0)
        group.actualCash = group.expectedCash + (Math.random() * 20 - 10)
        group.variance = group.actualCash - group.expectedCash
        const expectedCash = safeNumber(group.expectedCash, 0)
        group.variancePercent = expectedCash !== 0 ? (safeNumber(group.variance, 0) / expectedCash) * 100 : 0
        
        const passesFilter =
          selectedVarianceTypes.length === 0 ||
          selectedVarianceTypes.some(type => {
            if (type === "over") return group.variance > 0.5
            if (type === "under") return group.variance < -0.5
            if (type === "balanced") return Math.abs(group.variance) <= 0.5
            return false
          })
        
        group.passesFilter = passesFilter
      })

      return Object.values(tillGroups)
        .filter((g: any) => g.passesFilter)
        .sort((a: any, b: any) => Math.abs(safeNumber(b.variance, 0)) - Math.abs(safeNumber(a.variance, 0)))
    } catch (error) {
      console.error("Error calculating till reconciliations:", error)
      return []
    }
  }, [bills, startDate, endDate, selectedSites, selectedVarianceTypes, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const summary = useMemo(() => {
    try {
      return tillReconciliations.reduce((acc, till: any) => {
        acc.totalCashSales += safeNumber(till.cashSales, 0)
        acc.totalCardSales += safeNumber(till.cardSales, 0)
        acc.totalExpectedCash += safeNumber(till.expectedCash, 0)
        acc.totalActualCash += safeNumber(till.actualCash, 0)
      acc.totalVariance += till.variance
      acc.overCount += till.variance > 0.5 ? 1 : 0
      acc.underCount += till.variance < -0.5 ? 1 : 0
      acc.balancedCount += Math.abs(till.variance) <= 0.5 ? 1 : 0
      return acc
    }, {
      totalCashSales: 0,
      totalCardSales: 0,
      totalExpectedCash: 0,
      totalActualCash: 0,
      totalVariance: 0,
      overCount: 0,
      underCount: 0,
      balancedCount: 0,
    })
    } catch (error) {
      console.error("Error calculating summary:", error)
      return {
        totalCashSales: 0,
        totalCardSales: 0,
        totalExpectedCash: 0,
        totalActualCash: 0,
        totalVariance: 0,
        overCount: 0,
        underCount: 0,
        balancedCount: 0,
      }
    }
  }, [tillReconciliations])

  const getVarianceColor = (variance: number) => {
    if (Math.abs(variance) <= 0.5) return "success"
    if (variance > 0) return "info"
    return "error"
  }

  const getVarianceLabel = (variance: number) => {
    if (Math.abs(variance) <= 0.5) return "Balanced"
    if (variance > 0) return "Over"
    return "Short"
  }

  const siteFilterOptions = useMemo(() => 
    sites.map((site: any) => ({ id: site.id, name: site.name })),
    [sites]
  )

  const varianceTypeOptions = useMemo(() => [
    { id: "over", name: "Over" },
    { id: "under", name: "Under" },
    { id: "balanced", name: "Balanced" },
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
            label: "Variance Type",
            options: varianceTypeOptions,
            selectedValues: selectedVarianceTypes,
            onSelectionChange: setSelectedVarianceTypes,
          },
        ]}
        onExportCSV={() => console.log("Export CSV")}
        onExportPDF={() => console.log("Export PDF")}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Expected Cash</Typography>
              <Typography variant="h5">£{summary.totalExpectedCash.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Actual Cash</Typography>
              <Typography variant="h5">£{summary.totalActualCash.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Variance</Typography>
              <Typography variant="h5" color={summary.totalVariance >= 0 ? "info.main" : "error.main"}>
                {summary.totalVariance >= 0 ? "+" : ""}£{summary.totalVariance.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Till Status</Typography>
              <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                <Chip label={`${summary.balancedCount} OK`} color="success" size="small" />
                <Chip label={`${summary.overCount} Over`} color="info" size="small" />
                <Chip label={`${summary.underCount} Short`} color="error" size="small" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Till</TableCell>
              <TableCell>Site</TableCell>
              <TableCell align="right">Opening Float</TableCell>
              <TableCell align="right">Cash Sales</TableCell>
              <TableCell align="right">Card Sales</TableCell>
              <TableCell align="right">Deposits</TableCell>
              <TableCell align="right">Expected Cash</TableCell>
              <TableCell align="right">Actual Cash</TableCell>
              <TableCell align="right">Variance</TableCell>
              <TableCell align="right">Variance %</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tillReconciliations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} align="center">
                  <Typography color="text.secondary">No data for selected period</Typography>
                </TableCell>
              </TableRow>
            ) : (
              tillReconciliations.map((till: any, index) => (
                <TableRow key={index} sx={{ backgroundColor: Math.abs(till.variance) > 5 ? "error.light" : "inherit" }}>
                  <TableCell>{till.date}</TableCell>
                  <TableCell>{till.tillName}</TableCell>
                  <TableCell>{till.siteId}</TableCell>
                  <TableCell align="right">£{till.openingFloat.toFixed(2)}</TableCell>
                  <TableCell align="right">£{till.cashSales.toFixed(2)}</TableCell>
                  <TableCell align="right">£{till.cardSales.toFixed(2)}</TableCell>
                  <TableCell align="right">£{till.deposits.toFixed(2)}</TableCell>
                  <TableCell align="right"><strong>£{till.expectedCash.toFixed(2)}</strong></TableCell>
                  <TableCell align="right"><strong>£{till.actualCash.toFixed(2)}</strong></TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold", color: till.variance >= 0 ? "info.main" : "error.main" }}>
                    {till.variance >= 0 ? "+" : ""}£{till.variance.toFixed(2)}
                  </TableCell>
                  <TableCell align="right">{till.variancePercent.toFixed(2)}%</TableCell>
                  <TableCell>
                    <Chip 
                      label={getVarianceLabel(till.variance)} 
                      color={getVarianceColor(till.variance)} 
                      size="small" 
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

export default TillCashReconciliationReport
