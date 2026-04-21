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
import { subDays } from "date-fns"
import { 
  calculateDateRange, 
  filterByCompanyContext, 
  isDateInRange, 
  safeArray,
  safeNumber 
} from "../../../utils/reportHelpers"

const DiscountsPromotionsReport: React.FC = () => {
  const { posState, companyState } = usePOSReportContext()
  const { bills = [] } = posState || {}
  const { sites = [] } = companyState

  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("week")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [customStartDate, setCustomStartDate] = useState<Date>(subDays(new Date(), 7))
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date())
  const [selectedSites, setSelectedSites] = useState<string[]>([])
  const [selectedDiscountTypes, setSelectedDiscountTypes] = useState<string[]>([])

  const { startDate, endDate } = useMemo(() => {
    return calculateDateRange(dateType, currentDate, customStartDate, customEndDate)
  }, [dateType, currentDate, customStartDate, customEndDate])

  const discountAnalysis = useMemo(() => {
    try {
      // Filter bills by company context first
      const contextFilteredBills = filterByCompanyContext(
        safeArray(bills),
        companyState.selectedSiteID,
        companyState.selectedSubsiteID
      )
      
      const discountMap: Record<string, any> = {}
      
      contextFilteredBills.forEach((bill: any) => {
        if (!bill.date && !bill.timestamp) return
        
        // Use safe date checking
        if (!isDateInRange(bill.date || bill.timestamp, startDate, endDate)) return
        
        const siteId = bill.siteId || "Unknown"
        if (selectedSites.length > 0 && !selectedSites.includes(siteId)) return

        const discountValue = safeNumber(bill.discount, 0)
        if (discountValue > 0) {
          const discountCode = bill.discountCode || bill.promotionId || "Manual Discount"
          const discountType = bill.discountType || "manual"
          
          if (selectedDiscountTypes.length > 0 && !selectedDiscountTypes.includes(discountType)) return

          if (!discountMap[discountCode]) {
            discountMap[discountCode] = {
              code: discountCode,
              name: bill.promotionName || bill.discountName || discountCode,
              type: discountType,
              usageCount: 0,
              totalDiscountValue: 0,
              preDiscountSales: 0,
              postDiscountSales: 0,
              averageDiscountPerUse: 0,
              redemptionRate: 0,
              itemsAffected: 0,
            }
          }

          const discount = discountMap[discountCode]
          discount.usageCount += 1
          discount.totalDiscountValue += discountValue
          discount.preDiscountSales += safeNumber(bill.subtotal, 0)
          discount.postDiscountSales += safeNumber(bill.total, 0)
          
          const items = safeArray(bill.items)
          discount.itemsAffected += items.filter((item: any) => safeNumber(item.discount, 0) > 0).length
        }
      })

      Object.values(discountMap).forEach((discount: any) => {
        const usageCount = safeNumber(discount.usageCount, 0)
        discount.averageDiscountPerUse = usageCount > 0 ? safeNumber(discount.totalDiscountValue, 0) / usageCount : 0
        const preDiscountSales = safeNumber(discount.preDiscountSales, 0)
        discount.redemptionRate = preDiscountSales > 0 ? (safeNumber(discount.totalDiscountValue, 0) / preDiscountSales) * 100 : 0
      })

      return Object.values(discountMap).sort((a: any, b: any) => safeNumber(b.totalDiscountValue, 0) - safeNumber(a.totalDiscountValue, 0))
    } catch (error) {
      console.error("Error calculating discount analysis:", error)
      return []
    }
  }, [bills, startDate, endDate, selectedSites, selectedDiscountTypes, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const summary = useMemo(() => {
    try {
      return discountAnalysis.reduce((acc, discount: any) => {
        acc.totalUsages += safeNumber(discount.usageCount, 0)
        acc.totalDiscountValue += safeNumber(discount.totalDiscountValue, 0)
        acc.totalPreDiscountSales += safeNumber(discount.preDiscountSales, 0)
        acc.totalPostDiscountSales += safeNumber(discount.postDiscountSales, 0)
        acc.totalItemsAffected += safeNumber(discount.itemsAffected, 0)
        
        const usageCount = safeNumber(discount.usageCount, 0)
        if (discount.type === "manual") acc.manualCount += usageCount
        if (discount.type === "automatic") acc.automaticCount += usageCount
        if (discount.type === "loyalty") acc.loyaltyCount += usageCount
        
        return acc
      }, {
        totalUsages: 0,
        totalDiscountValue: 0,
      totalPreDiscountSales: 0,
      totalPostDiscountSales: 0,
      totalItemsAffected: 0,
      manualCount: 0,
      automaticCount: 0,
      loyaltyCount: 0,
    })
    } catch (error) {
      console.error("Error calculating summary:", error)
      return {
        totalUsages: 0,
        totalDiscountValue: 0,
        totalPreDiscountSales: 0,
        totalPostDiscountSales: 0,
        totalItemsAffected: 0,
        manualCount: 0,
        automaticCount: 0,
        loyaltyCount: 0,
      }
    }
  }, [discountAnalysis])

  const averageDiscountRate = summary.totalPreDiscountSales > 0 ? (summary.totalDiscountValue / summary.totalPreDiscountSales) * 100 : 0

  const getTypeColor = (type: string) => {
    switch (type) {
      case "manual": return "warning"
      case "automatic": return "primary"
      case "loyalty": return "success"
      default: return "default"
    }
  }

  const siteFilterOptions = useMemo(() => 
    sites.map((site: any) => ({ id: site.id, name: site.name })),
    [sites]
  )

  const discountTypeOptions = useMemo(() => [
    { id: "manual", name: "Manual" },
    { id: "automatic", name: "Automatic" },
    { id: "loyalty", name: "Loyalty" },
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
            label: "Discount Type",
            options: discountTypeOptions,
            selectedValues: selectedDiscountTypes,
            onSelectionChange: setSelectedDiscountTypes,
          },
        ]}
        onExportCSV={() => console.log("Export CSV")}
        onExportPDF={() => console.log("Export PDF")}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Discounts Given</Typography>
              <Typography variant="h5" color="error">£{summary.totalDiscountValue.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Usage Count</Typography>
              <Typography variant="h5">{summary.totalUsages}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Average Discount Rate</Typography>
              <Typography variant="h5">{averageDiscountRate.toFixed(2)}%</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Items Affected</Typography>
              <Typography variant="h5">{summary.totalItemsAffected}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Pre-Discount Sales</Typography>
              <Typography variant="h6">£{summary.totalPreDiscountSales.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Post-Discount Sales</Typography>
              <Typography variant="h6">£{summary.totalPostDiscountSales.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Discount Type Breakdown</Typography>
              <Box sx={{ display: "flex", gap: 0.5, mt: 1, flexWrap: "wrap" }}>
                <Chip label={`Manual: ${summary.manualCount}`} color="warning" size="small" />
                <Chip label={`Auto: ${summary.automaticCount}`} color="primary" size="small" />
                <Chip label={`Loyalty: ${summary.loyaltyCount}`} color="success" size="small" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Discount Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">Usage Count</TableCell>
              <TableCell align="right">Total Discount Value</TableCell>
              <TableCell align="right">Avg Per Use</TableCell>
              <TableCell align="right">Pre-Discount Sales</TableCell>
              <TableCell align="right">Post-Discount Sales</TableCell>
              <TableCell align="right">Redemption Rate</TableCell>
              <TableCell align="right">Items Affected</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {discountAnalysis.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  <Typography color="text.secondary">No discounts/promotions for selected period</Typography>
                </TableCell>
              </TableRow>
            ) : (
              discountAnalysis.map((discount: any, index) => (
                <TableRow key={index}>
                  <TableCell><strong>{discount.code}</strong></TableCell>
                  <TableCell>{discount.name}</TableCell>
                  <TableCell>
                    <Chip label={discount.type} color={getTypeColor(discount.type)} size="small" />
                  </TableCell>
                  <TableCell align="right">{discount.usageCount}</TableCell>
                  <TableCell align="right" sx={{ color: "error.main", fontWeight: "bold" }}>
                    -£{discount.totalDiscountValue.toFixed(2)}
                  </TableCell>
                  <TableCell align="right">£{discount.averageDiscountPerUse.toFixed(2)}</TableCell>
                  <TableCell align="right">£{discount.preDiscountSales.toFixed(2)}</TableCell>
                  <TableCell align="right">£{discount.postDiscountSales.toFixed(2)}</TableCell>
                  <TableCell align="right">{discount.redemptionRate.toFixed(2)}%</TableCell>
                  <TableCell align="right">{discount.itemsAffected}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

export default DiscountsPromotionsReport
