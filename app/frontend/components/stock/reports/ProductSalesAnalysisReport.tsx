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

const ProductSalesAnalysisReport: React.FC = () => {
  const { posState, companyState } = usePOSReportContext()
  const { stockState } = useStockReportContext()
  const { bills = [] } = posState || {}
  const { products = [], categories = [] } = stockState
  const { sites = [] } = companyState

  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("week")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [customStartDate, setCustomStartDate] = useState<Date>(subDays(new Date(), 7))
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date())
  const [selectedSites, setSelectedSites] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<string>("revenue")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [showTopN, setShowTopN] = useState<string>("20")

  const { startDate, endDate } = useMemo(() => {
    return calculateDateRange(dateType, currentDate, customStartDate, customEndDate)
  }, [dateType, currentDate, customStartDate, customEndDate])

  const productSales = useMemo(() => {
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

      bill.items?.forEach((item: any) => {
        const productId = item.productId || item.id || "unknown"
        const productData = products.find(p => p.id === productId)
        const categoryId = productData?.categoryId || item.category || "Unknown"
        const categoryName =
          categories.find((c: any) => c.id === categoryId)?.name ||
          productData?.categoryName ||
          item.categoryName ||
          categoryId
        
        if (selectedCategories.length > 0 && !selectedCategories.includes(categoryId)) return

        if (!productMap[productId]) {
          productMap[productId] = {
            productId,
            productName: item.name || productData?.name || "Unknown Product",
            categoryId,
            categoryName,
            quantitySold: 0,
            grossSales: 0,
            netSales: 0,
            discounts: 0,
            voids: 0,
            returns: 0,
            unitCost: (productData as any)?.cost || 0,
            totalCost: 0,
            grossProfit: 0,
            grossProfitPercent: 0,
          }
        }

        const product = productMap[productId]
        const quantity = safeNumber(item.quantity, 1)
        const itemPrice = safeNumber(item.price, 0)
        const itemDiscount = safeNumber(item.discount, 0)
        const itemTotal = itemPrice * quantity - itemDiscount

        if (bill.status === "void") {
          product.voids += itemTotal
        } else if (bill.status === "refund") {
          product.returns += itemTotal
        } else {
          product.quantitySold += quantity
          product.grossSales += itemPrice * quantity
          product.discounts += itemDiscount
          product.netSales += itemTotal
          product.totalCost += (product.unitCost * quantity)
        }
      })
      })
      
      Object.values(productMap).forEach((product: any) => {
        product.grossProfit = safeNumber(product.netSales, 0) - safeNumber(product.totalCost, 0)
        const netSales = safeNumber(product.netSales, 0)
        product.grossProfitPercent = netSales !== 0 ? (safeNumber(product.grossProfit, 0) / netSales) * 100 : 0
      })

      const sorted = Object.values(productMap).sort((a: any, b: any) => {
        const multiplier = sortDirection === "asc" ? 1 : -1
        switch (sortBy) {
          case "quantity":
            return (safeNumber(b.quantitySold, 0) - safeNumber(a.quantitySold, 0)) * multiplier
          case "revenue":
            return (safeNumber(b.netSales, 0) - safeNumber(a.netSales, 0)) * multiplier
          case "margin":
            return (safeNumber(b.grossProfit, 0) - safeNumber(a.grossProfit, 0)) * multiplier
          case "name":
            return (a.productName || "").localeCompare(b.productName || "") * multiplier
          default:
            return (safeNumber(b.netSales, 0) - safeNumber(a.netSales, 0)) * multiplier
        }
      })

      const limit = showTopN === "all" ? sorted.length : parseInt(showTopN) || 20
      return sorted.slice(0, limit)
    } catch (error) {
      console.error("Error calculating product sales:", error)
      return []
    }
  }, [bills, products, startDate, endDate, selectedSites, selectedCategories, sortBy, sortDirection, showTopN, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const summary = useMemo(() => {
    try {
      return productSales.reduce((acc, product: any) => {
        acc.totalQuantity += safeNumber(product.quantitySold, 0)
        acc.totalGrossSales += safeNumber(product.grossSales, 0)
        acc.totalNetSales += safeNumber(product.netSales, 0)
        acc.totalDiscounts += safeNumber(product.discounts, 0)
        acc.totalCost += safeNumber(product.totalCost, 0)
        acc.totalGrossProfit += safeNumber(product.grossProfit, 0)
        return acc
      }, {
        totalQuantity: 0,
        totalGrossSales: 0,
        totalNetSales: 0,
        totalDiscounts: 0,
        totalCost: 0,
        totalGrossProfit: 0,
      })
    } catch (error) {
      console.error("Error calculating summary:", error)
      return {
        totalQuantity: 0,
        totalGrossSales: 0,
        totalNetSales: 0,
        totalDiscounts: 0,
        totalCost: 0,
        totalGrossProfit: 0,
      }
    }
  }, [productSales])

  const averageGP = summary.totalNetSales !== 0 ? (summary.totalGrossProfit / summary.totalNetSales) * 100 : 0

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
    { value: "quantity", label: "Quantity" },
    { value: "margin", label: "Margin" },
    { value: "name", label: "Name" },
  ], [])

  const topNOptions = useMemo(() => [
    { value: "10", label: "Top 10" },
    { value: "20", label: "Top 20" },
    { value: "50", label: "Top 50" },
    { value: "100", label: "Top 100" },
    { value: "all", label: "All Products" },
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
        groupByOptions={topNOptions}
        groupByValue={showTopN}
        onGroupByChange={setShowTopN}
        onExportCSV={() => console.log("Export CSV")}
        onExportPDF={() => console.log("Export PDF")}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Items Sold</Typography>
              <Typography variant="h5">{summary.totalQuantity}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Gross Sales</Typography>
              <Typography variant="h5">£{summary.totalGrossSales.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Net Sales</Typography>
              <Typography variant="h5">£{summary.totalNetSales.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Cost</Typography>
              <Typography variant="h5">£{summary.totalCost.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Gross Profit</Typography>
              <Typography variant="h5" color="success.main">£{summary.totalGrossProfit.toFixed(2)}</Typography>
              <Typography variant="caption" color="text.secondary">({averageGP.toFixed(1)}%)</Typography>
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
              <TableCell align="right">Gross Sales</TableCell>
              <TableCell align="right">Discounts</TableCell>
              <TableCell align="right">Net Sales</TableCell>
              <TableCell align="right">Unit Cost</TableCell>
              <TableCell align="right">Total Cost</TableCell>
              <TableCell align="right">Gross Profit</TableCell>
              <TableCell align="right">GP%</TableCell>
              <TableCell align="right">Voids</TableCell>
              <TableCell align="right">Returns</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {productSales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} align="center">
                  <Typography color="text.secondary">No product sales for selected period</Typography>
                </TableCell>
              </TableRow>
            ) : (
              productSales.map((product: any, index) => (
                <TableRow key={index} sx={{ backgroundColor: product.grossProfitPercent < 0 ? "error.light" : "inherit" }}>
                  <TableCell>{product.productName}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell align="right"><strong>{product.quantitySold}</strong></TableCell>
                  <TableCell align="right">£{product.grossSales.toFixed(2)}</TableCell>
                  <TableCell align="right" color="error">-£{product.discounts.toFixed(2)}</TableCell>
                  <TableCell align="right"><strong>£{product.netSales.toFixed(2)}</strong></TableCell>
                  <TableCell align="right">£{product.unitCost.toFixed(2)}</TableCell>
                  <TableCell align="right">£{product.totalCost.toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ color: product.grossProfit >= 0 ? "success.main" : "error.main", fontWeight: "bold" }}>
                    £{product.grossProfit.toFixed(2)}
                  </TableCell>
                  <TableCell align="right" sx={{ color: product.grossProfitPercent >= 0 ? "success.main" : "error.main" }}>
                    {product.grossProfitPercent.toFixed(1)}%
                  </TableCell>
                  <TableCell align="right">{product.voids > 0 ? `£${product.voids.toFixed(2)}` : "-"}</TableCell>
                  <TableCell align="right">{product.returns > 0 ? `£${product.returns.toFixed(2)}` : "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

export default ProductSalesAnalysisReport
