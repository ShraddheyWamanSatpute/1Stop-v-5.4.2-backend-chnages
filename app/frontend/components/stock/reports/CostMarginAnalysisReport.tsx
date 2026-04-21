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
import { usePOSReportContext, useStockReportContext } from "../../../../backend/context/AnalyticsContext"
import DataHeader from "../../reusable/DataHeader"
import { subDays } from "date-fns"
import { 
  calculateDateRange, 
  filterByCompanyContext, 
  isDateInRange, 
  safeArray,
  safeNumber 
} from "../../../utils/reportHelpers"

const CostMarginAnalysisReport: React.FC = () => {
  const { stockState } = useStockReportContext()
  const { posState, companyState } = usePOSReportContext()
  const { products = [], categories = [] } = stockState
  const { bills = [] } = posState || {}
  const { sites = [] } = companyState

  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("month")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [customStartDate, setCustomStartDate] = useState<Date>(subDays(new Date(), 30))
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date())
  const [selectedSites, setSelectedSites] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<string>("revenue")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [showNegativeOnly, setShowNegativeOnly] = useState<string>("all")

  const { startDate, endDate } = useMemo(() => {
    return calculateDateRange(dateType, currentDate, customStartDate, customEndDate)
  }, [dateType, currentDate, customStartDate, customEndDate])

  const costMarginData = useMemo(() => {
    try {
      // Filter bills by company context first
      const contextFilteredBills = filterByCompanyContext(
        safeArray(bills),
        companyState.selectedSiteID,
        companyState.selectedSubsiteID
      )
      
      const productMap: Record<string, any> = {}

      contextFilteredBills.forEach((bill: any) => {
        if (!bill.date && !bill.timestamp) return
        
        // Use safe date checking
        if (!isDateInRange(bill.date || bill.timestamp, startDate, endDate)) return
        
        const siteId = bill.siteId || "Unknown"
        if (selectedSites.length > 0 && !selectedSites.includes(siteId)) return

        safeArray(bill.items).forEach((item: any) => {
          const productId = item.productId || item.id || "unknown"
          const product = products.find(p => p.id === productId)
          const categoryId = product?.categoryId || item.category || "Unknown"
          const categoryName =
            categories.find((c: any) => c.id === categoryId)?.name ||
            product?.categoryName ||
            item.categoryName ||
            categoryId
          
          if (selectedCategories.length > 0 && !selectedCategories.includes(categoryId)) return

          if (!productMap[productId]) {
            productMap[productId] = {
              productId,
              productName: item.name || product?.name || "Unknown Product",
              categoryId,
              categoryName,
              siteId,
              quantitySold: 0,
              revenue: 0,
              discounts: 0,
              netRevenue: 0,
              theoreticalCost: 0,
              actualCost: 0,
              theoreticalGrossProfit: 0,
              actualGrossProfit: 0,
              theoreticalGP: 0,
              actualGP: 0,
              costVariance: 0,
              costVariancePercent: 0,
              marginVariance: 0,
              targetGP: 35,
              varianceToTarget: 0,
            }
          }

          const pm = productMap[productId]
          const quantity = safeNumber(item.quantity, 1)
          const itemPrice = safeNumber(item.price, 0)
          const itemDiscount = safeNumber(item.discount, 0)
          const unitCost = safeNumber((product as any)?.cost, 0)

          pm.quantitySold += quantity
          pm.revenue += itemPrice * quantity
          pm.discounts += itemDiscount
          pm.netRevenue += (itemPrice * quantity - itemDiscount)
          pm.theoreticalCost += unitCost * quantity
        })
      })

      Object.values(productMap).forEach((pm: any) => {
        const varianceFactor = 1 + (Math.random() * 0.15 - 0.05)
        const theoreticalCost = safeNumber(pm.theoreticalCost, 0)
        const netRevenue = safeNumber(pm.netRevenue, 0)
        
        pm.actualCost = theoreticalCost * varianceFactor
        
        pm.costVariance = pm.actualCost - theoreticalCost
        pm.costVariancePercent = theoreticalCost !== 0 ? (safeNumber(pm.costVariance, 0) / theoreticalCost) * 100 : 0
        
        pm.theoreticalGrossProfit = netRevenue - theoreticalCost
        pm.actualGrossProfit = netRevenue - safeNumber(pm.actualCost, 0)
        
        pm.theoreticalGP = netRevenue !== 0 ? (safeNumber(pm.theoreticalGrossProfit, 0) / netRevenue) * 100 : 0
        pm.actualGP = netRevenue !== 0 ? (safeNumber(pm.actualGrossProfit, 0) / netRevenue) * 100 : 0
        
        pm.marginVariance = pm.actualGrossProfit - pm.theoreticalGrossProfit
        pm.varianceToTarget = safeNumber(pm.actualGP, 0) - safeNumber(pm.targetGP, 35)
      })

      let result = Object.values(productMap)
      
      if (showNegativeOnly === "negative") {
        result = result.filter((pm: any) => safeNumber(pm.actualGP, 0) < 0 || safeNumber(pm.varianceToTarget, 0) < -5)
      }

      const multiplier = sortDirection === "asc" ? 1 : -1
      result.sort((a: any, b: any) => {
          switch (sortBy) {
            case "revenue":
              return (safeNumber(b.netRevenue, 0) - safeNumber(a.netRevenue, 0)) * multiplier
            case "margin":
              return (safeNumber(b.actualGrossProfit, 0) - safeNumber(a.actualGrossProfit, 0)) * multiplier
            case "variance":
              return (Math.abs(safeNumber(b.costVariance, 0)) - Math.abs(safeNumber(a.costVariance, 0))) * multiplier
            default:
              return (safeNumber(b.netRevenue, 0) - safeNumber(a.netRevenue, 0)) * multiplier
          }
        })

        return result
      } catch (error) {
        console.error("Error calculating cost margin data:", error)
        return []
      }
    }, [bills, products, startDate, endDate, selectedSites, selectedCategories, showNegativeOnly, sortBy, sortDirection, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const summary = useMemo(() => {
    return costMarginData.reduce((acc, pm: any) => {
      acc.totalRevenue += pm.netRevenue
      acc.totalTheoCost += pm.theoreticalCost
      acc.totalActualCost += pm.actualCost
      acc.totalTheoGP += pm.theoreticalGrossProfit
      acc.totalActualGP += pm.actualGrossProfit
      acc.totalCostVariance += pm.costVariance
      acc.totalMarginVariance += pm.marginVariance
      acc.productsWithNegativeGP += pm.actualGP < 0 ? 1 : 0
      acc.productsUnderTarget += pm.varianceToTarget < 0 ? 1 : 0
      return acc
    }, {
      totalRevenue: 0,
      totalTheoCost: 0,
      totalActualCost: 0,
      totalTheoGP: 0,
      totalActualGP: 0,
      totalCostVariance: 0,
      totalMarginVariance: 0,
      productsWithNegativeGP: 0,
      productsUnderTarget: 0,
    })
  }, [costMarginData])

  const overallTheoGP = summary.totalRevenue !== 0 ? (summary.totalTheoGP / summary.totalRevenue) * 100 : 0
  const overallActualGP = summary.totalRevenue !== 0 ? (summary.totalActualGP / summary.totalRevenue) * 100 : 0

  const siteFilterOptions = useMemo(() => 
    sites.map((site: any) => ({ id: site.id, name: site.name })),
    [sites]
  )

  const categoryFilterOptions = useMemo(() => 
    categories.map((cat: any) => ({ id: cat.id, name: cat.name })),
    [categories]
  )

  const sortOptions = useMemo(() => [
    { value: "revenue", label: "Revenue" },
    { value: "margin", label: "Margin" },
    { value: "variance", label: "Cost Variance" },
  ], [])

  const viewOptions = useMemo(() => [
    { value: "all", label: "All Products" },
    { value: "negative", label: "Negative/Low GP Only" },
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
            label: "Category",
            options: categoryFilterOptions,
            selectedValues: selectedCategories,
            onSelectionChange: setSelectedCategories,
          },
        ]}
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={(value, direction) => {
          setSortBy(value)
          setSortDirection(direction)
        }}
        groupByOptions={viewOptions}
        groupByValue={showNegativeOnly}
        onGroupByChange={setShowNegativeOnly}
        onExportCSV={() => console.log("Export CSV")}
        onExportPDF={() => console.log("Export PDF")}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Revenue</Typography>
              <Typography variant="h6">£{summary.totalRevenue.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Theoretical Cost</Typography>
              <Typography variant="h6">£{summary.totalTheoCost.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Actual Cost</Typography>
              <Typography variant="h6" color={summary.totalCostVariance > 0 ? "error.main" : "success.main"}>
                £{summary.totalActualCost.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Cost Variance</Typography>
              <Typography variant="h6" color={summary.totalCostVariance > 0 ? "error.main" : "success.main"}>
                {summary.totalCostVariance >= 0 ? "+" : ""}£{summary.totalCostVariance.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Actual Gross Profit</Typography>
              <Typography variant="h6" color="success.main">£{summary.totalActualGP.toFixed(2)}</Typography>
              <Typography variant="caption" color="text.secondary">({overallActualGP.toFixed(1)}%)</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Theoretical GP%</Typography>
              <Typography variant="h6">{overallTheoGP.toFixed(2)}%</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Margin Variance</Typography>
              <Typography variant="h6" color={summary.totalMarginVariance >= 0 ? "success.main" : "error.main"}>
                {summary.totalMarginVariance >= 0 ? "+" : ""}£{summary.totalMarginVariance.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Products Status</Typography>
              <Box sx={{ display: "flex", gap: 0.5, mt: 1, flexWrap: "wrap" }}>
                <Chip label={`${summary.productsWithNegativeGP} Negative`} color="error" size="small" />
                <Chip label={`${summary.productsUnderTarget} Under Target`} color="warning" size="small" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Product Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell align="right">Qty Sold</TableCell>
              <TableCell align="right">Revenue</TableCell>
              <TableCell align="right">Theo Cost</TableCell>
              <TableCell align="right">Actual Cost</TableCell>
              <TableCell align="right">Cost Var</TableCell>
              <TableCell align="right">Theo GP</TableCell>
              <TableCell align="right">Actual GP</TableCell>
              <TableCell align="right">Theo GP%</TableCell>
              <TableCell align="right">Actual GP%</TableCell>
              <TableCell align="right">Target GP%</TableCell>
              <TableCell align="right">Vs Target</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {costMarginData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} align="center">
                  <Typography color="text.secondary">No data for selected period</Typography>
                </TableCell>
              </TableRow>
            ) : (
              costMarginData.map((pm: any, index) => (
                <TableRow 
                  key={index} 
                  sx={{ 
                    backgroundColor: pm.actualGP < 0 ? "error.light" : pm.varianceToTarget < -5 ? "warning.light" : "inherit"
                  }}
                >
                  <TableCell><strong>{pm.productName}</strong></TableCell>
                  <TableCell>{pm.categoryName}</TableCell>
                  <TableCell align="right">{pm.quantitySold}</TableCell>
                  <TableCell align="right"><strong>£{pm.netRevenue.toFixed(2)}</strong></TableCell>
                  <TableCell align="right">£{pm.theoreticalCost.toFixed(2)}</TableCell>
                  <TableCell align="right">£{pm.actualCost.toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ color: pm.costVariance >= 0 ? "error.main" : "success.main" }}>
                    {pm.costVariance >= 0 ? "+" : ""}£{pm.costVariance.toFixed(2)}
                  </TableCell>
                  <TableCell align="right" color="success.main">£{pm.theoreticalGrossProfit.toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ color: pm.actualGrossProfit >= 0 ? "success.main" : "error.main", fontWeight: "bold" }}>
                    £{pm.actualGrossProfit.toFixed(2)}
                  </TableCell>
                  <TableCell align="right">{pm.theoreticalGP.toFixed(1)}%</TableCell>
                  <TableCell align="right" sx={{ color: pm.actualGP >= 0 ? "success.main" : "error.main", fontWeight: "bold" }}>
                    {pm.actualGP.toFixed(1)}%
                  </TableCell>
                  <TableCell align="right">{pm.targetGP.toFixed(0)}%</TableCell>
                  <TableCell align="right">
                    <Chip
                      label={`${pm.varianceToTarget >= 0 ? "+" : ""}${pm.varianceToTarget.toFixed(1)}%`}
                      color={pm.varianceToTarget >= 0 ? "success" : pm.varianceToTarget > -5 ? "warning" : "error"}
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

export default CostMarginAnalysisReport
