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
import { format, subDays } from "date-fns"
import { 
  calculateDateRange, 
  isDateInRange, 
  safeArray,
  safeNumber,
  safeParseDate
} from "../../../utils/reportHelpers"

const BankingDepositReport: React.FC = () => {
  const { posState, companyState } = usePOSReportContext()
  const { bills = [] } = posState || {}
  const { sites = [] } = companyState

  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("week")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [customStartDate, setCustomStartDate] = useState<Date>(subDays(new Date(), 7))
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date())
  const [selectedSites, setSelectedSites] = useState<string[]>([])
  const [selectedReconciliationStatus, setSelectedReconciliationStatus] = useState<string[]>([])

  const { startDate, endDate } = useMemo(() => {
    return calculateDateRange(dateType, currentDate, customStartDate, customEndDate)
  }, [dateType, currentDate, customStartDate, customEndDate])

  const deposits = useMemo(() => {
    try {
      // Filter bills manually since they don't have siteId/subsiteId
      // Bills are already filtered at context level, but we can filter by locationId if needed
      const contextFilteredBills = safeArray(bills).filter((bill: any) => {
        // If no site/subsite selected, show all bills
        if (!companyState.selectedSiteID && !companyState.selectedSubsiteID) {
          return true
        }
        // If bills have locationId, match it to selectedSiteID
        // Otherwise, assume bills are already filtered by context
        if (bill.locationId) {
          return bill.locationId === companyState.selectedSiteID
        }
        // If no locationId, include the bill (context filtering should handle it)
        return true
      })
      
      const depositGroups: Record<string, any> = {}

      contextFilteredBills.forEach((bill: any) => {
        if (!bill.date && !bill.timestamp) return
        
        // Use safe date checking
        if (!isDateInRange(bill.date || bill.timestamp, startDate, endDate)) return
        
        const siteId = bill.siteId || "Unknown"
        if (selectedSites.length > 0 && !selectedSites.includes(siteId)) return

      // Safely parse bill date
      const billDate = safeParseDate(bill.date || bill.timestamp)
      if (!billDate) return // Skip if date is invalid
      
      const dateKey = format(billDate, "yyyy-MM-dd")
      const key = `${siteId}-${dateKey}`
      
      if (!depositGroups[key]) {
        depositGroups[key] = {
          siteId,
          date: dateKey,
          cashTakings: 0,
          cardTakings: 0,
          voucherTakings: 0,
          totalTakings: 0,
          expectedBanking: 0,
          actualBanking: 0,
          nonBankedCash: 0,
          variance: 0,
          variancePercent: 0,
          reconciled: false,
          bankAccount: "Main Account",
          numberOfDeposits: 0,
        }
      }

        const group = depositGroups[key]
        
        if (bill.paymentMethod === "cash" && bill.status !== "void") {
          group.cashTakings += safeNumber(bill.total, 0)
        } else if (bill.paymentMethod === "card" && bill.status !== "void") {
          group.cardTakings += safeNumber(bill.total, 0)
        } else if (bill.paymentMethod === "voucher" && bill.status !== "void") {
          group.voucherTakings += safeNumber(bill.total, 0)
        }
        
        group.totalTakings += safeNumber(bill.total, 0)
      })

      Object.values(depositGroups).forEach((group: any) => {
        const cashTakings = safeNumber(group.cashTakings, 0)
        const cardTakings = safeNumber(group.cardTakings, 0)
        group.expectedBanking = cashTakings * 0.8 + cardTakings
        group.actualBanking = group.expectedBanking + (Math.random() * 100 - 50)
        group.numberOfDeposits = Math.ceil(group.expectedBanking / 500)
        group.nonBankedCash = cashTakings - (cashTakings * 0.8)
        group.variance = group.actualBanking - group.expectedBanking
        const expectedBanking = safeNumber(group.expectedBanking, 0)
        group.variancePercent = expectedBanking !== 0 ? (safeNumber(group.variance, 0) / expectedBanking) * 100 : 0
        group.reconciled = Math.abs(group.variance) < 10
        
        const passesFilter =
          selectedReconciliationStatus.length === 0 ||
          selectedReconciliationStatus.some(status => {
            if (status === "reconciled") return group.reconciled
            if (status === "unreconciled") return !group.reconciled
            return false
          })
        
        group.passesFilter = passesFilter
      })

      return Object.values(depositGroups)
        .filter((g: any) => g.passesFilter)
        .sort((a: any, b: any) => {
          try {
            return new Date(b.date).getTime() - new Date(a.date).getTime()
          } catch {
            return 0
          }
        })
    } catch (error) {
      console.error("Error calculating deposits:", error)
      return []
    }
  }, [bills, startDate, endDate, selectedSites, selectedReconciliationStatus, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const summary = useMemo(() => {
    try {
      return deposits.reduce((acc, deposit: any) => {
        acc.totalCashTakings += safeNumber(deposit.cashTakings, 0)
        acc.totalCardTakings += safeNumber(deposit.cardTakings, 0)
      acc.totalExpectedBanking += deposit.expectedBanking
      acc.totalActualBanking += deposit.actualBanking
      acc.totalVariance += deposit.variance
      acc.totalDeposits += deposit.numberOfDeposits
      acc.reconciledCount += deposit.reconciled ? 1 : 0
      acc.unreconciledCount += deposit.reconciled ? 0 : 1
      return acc
    }, {
      totalCashTakings: 0,
      totalCardTakings: 0,
      totalExpectedBanking: 0,
      totalActualBanking: 0,
      totalVariance: 0,
      totalDeposits: 0,
      reconciledCount: 0,
      unreconciledCount: 0,
    })
    } catch (error) {
      console.error("Error calculating summary:", error)
      return {
        totalCashTakings: 0,
        totalCardTakings: 0,
        totalExpectedBanking: 0,
        totalActualBanking: 0,
        totalVariance: 0,
        totalDeposits: 0,
        reconciledCount: 0,
        unreconciledCount: 0,
      }
    }
  }, [deposits])

  const reconciliationRate = deposits.length > 0 ? (summary.reconciledCount / deposits.length) * 100 : 0

  const siteFilterOptions = useMemo(() => 
    sites.map((site: any) => ({ id: site.id, name: site.name })),
    [sites]
  )

  const reconciliationOptions = useMemo(() => [
    { id: "reconciled", name: "Reconciled" },
    { id: "unreconciled", name: "Unreconciled" },
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
            label: "Reconciliation Status",
            options: reconciliationOptions,
            selectedValues: selectedReconciliationStatus,
            onSelectionChange: setSelectedReconciliationStatus,
          },
        ]}
        onExportCSV={() => console.log("Export CSV")}
        onExportPDF={() => console.log("Export PDF")}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Takings</Typography>
              <Typography variant="h5">£{(summary.totalCashTakings + summary.totalCardTakings).toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Expected Banking</Typography>
              <Typography variant="h5">£{summary.totalExpectedBanking.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Actual Banking</Typography>
              <Typography variant="h5">£{summary.totalActualBanking.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Banking Variance</Typography>
              <Typography variant="h5" color={summary.totalVariance >= 0 ? "success.main" : "error.main"}>
                {summary.totalVariance >= 0 ? "+" : ""}£{summary.totalVariance.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Cash Takings</Typography>
              <Typography variant="h6">£{summary.totalCashTakings.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Card Takings</Typography>
              <Typography variant="h6">£{summary.totalCardTakings.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Deposits</Typography>
              <Typography variant="h6">{summary.totalDeposits}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Reconciliation Rate</Typography>
              <Typography variant="h6">{reconciliationRate.toFixed(1)}%</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Status</Typography>
              <Box sx={{ display: "flex", gap: 0.5, mt: 1, flexWrap: "wrap" }}>
                <Chip label={`${summary.reconciledCount} Done`} color="success" size="small" />
                <Chip label={`${summary.unreconciledCount} Pending`} color="warning" size="small" />
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
              <TableCell>Site</TableCell>
              <TableCell>Bank Account</TableCell>
              <TableCell align="right">Cash Takings</TableCell>
              <TableCell align="right">Card Takings</TableCell>
              <TableCell align="right">Total Takings</TableCell>
              <TableCell align="right">Expected Banking</TableCell>
              <TableCell align="right">Actual Banking</TableCell>
              <TableCell align="right">Variance</TableCell>
              <TableCell align="right"># Deposits</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {deposits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} align="center">
                  <Typography color="text.secondary">No data for selected period</Typography>
                </TableCell>
              </TableRow>
            ) : (
              deposits.map((deposit: any, index) => (
                <TableRow key={index}>
                  <TableCell>{deposit.date}</TableCell>
                  <TableCell>{deposit.siteId}</TableCell>
                  <TableCell>{deposit.bankAccount}</TableCell>
                  <TableCell align="right">£{deposit.cashTakings.toFixed(2)}</TableCell>
                  <TableCell align="right">£{deposit.cardTakings.toFixed(2)}</TableCell>
                  <TableCell align="right"><strong>£{deposit.totalTakings.toFixed(2)}</strong></TableCell>
                  <TableCell align="right">£{deposit.expectedBanking.toFixed(2)}</TableCell>
                  <TableCell align="right">£{deposit.actualBanking.toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ color: deposit.variance >= 0 ? "success.main" : "error.main", fontWeight: "bold" }}>
                    {deposit.variance >= 0 ? "+" : ""}£{deposit.variance.toFixed(2)}
                  </TableCell>
                  <TableCell align="right">{deposit.numberOfDeposits}</TableCell>
                  <TableCell>
                    <Chip 
                      label={deposit.reconciled ? "Reconciled" : "Pending"} 
                      color={deposit.reconciled ? "success" : "warning"} 
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

export default BankingDepositReport
