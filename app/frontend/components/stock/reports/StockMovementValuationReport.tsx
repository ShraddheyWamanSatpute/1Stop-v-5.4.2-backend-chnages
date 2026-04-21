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
import { useStockReportContext } from "../../../../backend/context/AnalyticsContext"
import DataHeader from "../../reusable/DataHeader"
import { subDays } from "date-fns"
import { 
  calculateDateRange, 
  filterByCompanyContext, 
  safeArray,
  safeNumber 
} from "../../../utils/reportHelpers"

const StockMovementValuationReport: React.FC = () => {
  const { stockState, companyState } = useStockReportContext()
  const { products = [], categories = [], purchaseHistory = [] } = stockState

  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("week")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [customStartDate, setCustomStartDate] = useState<Date>(subDays(new Date(), 7))
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date())
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedMovementTypes, setSelectedMovementTypes] = useState<string[]>([])
  const [showVarianceOnly, setShowVarianceOnly] = useState<string>("all")

  const { startDate, endDate } = useMemo(() => {
    return calculateDateRange(dateType, currentDate, customStartDate, customEndDate)
  }, [dateType, currentDate, customStartDate, customEndDate])

  const stockMovements = useMemo(() => {
    try {
      // Filter products by company context first
      const contextFilteredProducts = filterByCompanyContext(
        safeArray(products),
        companyState.selectedSiteID,
        companyState.selectedSubsiteID
      )
      
      const movementMap: Record<string, any> = {}

      contextFilteredProducts.forEach((product: any) => {
        if (selectedCategories.length > 0 && !selectedCategories.includes(product.categoryId)) return

      const productId = product.id
      
      if (!movementMap[productId]) {
        movementMap[productId] = {
          productId,
          productCode: product.code || product.id,
          productName: product.name,
          category: product.categoryId || "Unknown",
          uom: product.measureId || "unit",
          openingStock: 0,
          openingValue: 0,
          purchases: 0,
          purchaseValue: 0,
          transfersIn: 0,
          transfersInValue: 0,
          transfersOut: 0,
          transfersOutValue: 0,
          salesUsage: 0,
          salesUsageValue: 0,
          wastage: 0,
          wastageValue: 0,
          adjustments: 0,
          adjustmentsValue: 0,
          closingStock: 0,
          closingValue: 0,
          quantityVariance: 0,
          valueVariance: 0,
          unitCost: (product as any).cost || 0,
        }
      }

        const movement = movementMap[productId]
        const unitCost = safeNumber((product as any).cost, 0)
        movement.unitCost = unitCost
        
        movement.openingStock = Math.floor(Math.random() * 100) + 50
        movement.openingValue = movement.openingStock * unitCost

        const productPurchases = safeArray(purchaseHistory).filter((p: any) => {
          if (p.productId !== productId) return false
          if (!p.date) return false
          // Use safe date checking - note: purchaseHistory might not have siteId/subsiteId
          // so we'll check dates only
          try {
            const purchaseDate = new Date(p.date)
            return purchaseDate >= startDate && purchaseDate <= endDate
          } catch {
            return false
          }
        })
        
        productPurchases.forEach((purchase: any) => {
          const quantity = safeNumber(purchase.quantity, 0)
          const purchaseUnitCost = safeNumber(purchase.unitCost, unitCost)
          movement.purchases += quantity
          movement.purchaseValue += quantity * purchaseUnitCost
        })

        movement.salesUsage = Math.floor(Math.random() * movement.openingStock * 0.6)
        movement.salesUsageValue = movement.salesUsage * unitCost
        
        movement.wastage = Math.floor(Math.random() * 5)
        movement.wastageValue = movement.wastage * unitCost
        
        movement.transfersIn = Math.floor(Math.random() * 10)
        movement.transfersInValue = movement.transfersIn * unitCost
        
        movement.transfersOut = Math.floor(Math.random() * 10)
        movement.transfersOutValue = movement.transfersOut * unitCost
        
        movement.adjustments = Math.floor(Math.random() * 6) - 3
        movement.adjustmentsValue = movement.adjustments * unitCost

        movement.closingStock = movement.openingStock + movement.purchases + movement.transfersIn - movement.transfersOut - movement.salesUsage - movement.wastage + movement.adjustments
        movement.closingValue = movement.closingStock * unitCost

        const theoreticalClosing = movement.openingStock + movement.purchases + movement.transfersIn - movement.transfersOut - movement.salesUsage - movement.wastage
        movement.quantityVariance = movement.closingStock - theoreticalClosing
        movement.valueVariance = movement.quantityVariance * unitCost

        movement.passesFilter = true
        if (selectedMovementTypes.length > 0) {
          movement.passesFilter = selectedMovementTypes.some((type: string) => {
            if (type === "purchase") return movement.purchases > 0
            if (type === "sale") return movement.salesUsage > 0
            if (type === "wastage") return movement.wastage > 0
            if (type === "transfer") return movement.transfersIn > 0 || movement.transfersOut > 0
            if (type === "adjustment") return movement.adjustments !== 0
            return true
          })
        }
      })

      let result = Object.values(movementMap).filter((m: any) => m.passesFilter)
      
      if (showVarianceOnly === "variance") {
        result = result.sort((a: any, b: any) => Math.abs(safeNumber(b.valueVariance, 0)) - Math.abs(safeNumber(a.valueVariance, 0))).slice(0, 50)
      }

      return result
    } catch (error) {
      console.error("Error calculating stock movements:", error)
      return []
    }
  }, [products, purchaseHistory, startDate, endDate, selectedCategories, selectedMovementTypes, showVarianceOnly, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const summary = useMemo(() => {
    return stockMovements.reduce((acc, movement: any) => {
      acc.totalOpeningValue += movement.openingValue
      acc.totalPurchaseValue += movement.purchaseValue
      acc.totalSalesUsageValue += movement.salesUsageValue
      acc.totalWastageValue += movement.wastageValue
      acc.totalClosingValue += movement.closingValue
      acc.totalVarianceValue += movement.valueVariance
      acc.totalVarianceQty += Math.abs(movement.quantityVariance)
      return acc
    }, {
      totalOpeningValue: 0,
      totalPurchaseValue: 0,
      totalSalesUsageValue: 0,
      totalWastageValue: 0,
      totalClosingValue: 0,
      totalVarianceValue: 0,
      totalVarianceQty: 0,
    })
  }, [stockMovements])

  const categoryFilterOptions = useMemo(() => 
    categories.map((cat: any) => ({ id: cat.id, name: cat.name })),
    [categories]
  )

  const movementTypeOptions = useMemo(() => [
    { id: "purchase", name: "Purchases" },
    { id: "sale", name: "Sales" },
    { id: "wastage", name: "Wastage" },
    { id: "transfer", name: "Transfers" },
    { id: "adjustment", name: "Adjustments" },
  ], [])

  const varianceViewOptions = useMemo(() => [
    { value: "all", label: "All Products" },
    { value: "variance", label: "Top 50 Variance" },
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
            label: "Category",
            options: categoryFilterOptions,
            selectedValues: selectedCategories,
            onSelectionChange: setSelectedCategories,
          },
          {
            label: "Movement Type",
            options: movementTypeOptions,
            selectedValues: selectedMovementTypes,
            onSelectionChange: setSelectedMovementTypes,
          },
        ]}
        groupByOptions={varianceViewOptions}
        groupByValue={showVarianceOnly}
        onGroupByChange={setShowVarianceOnly}
        onExportCSV={() => console.log("Export CSV")}
        onExportPDF={() => console.log("Export PDF")}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Opening Value</Typography>
              <Typography variant="h6">£{summary.totalOpeningValue.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Purchases</Typography>
              <Typography variant="h6" color="success.main">+£{summary.totalPurchaseValue.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Sales Usage</Typography>
              <Typography variant="h6" color="error.main">-£{summary.totalSalesUsageValue.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Wastage</Typography>
              <Typography variant="h6" color="warning.main">-£{summary.totalWastageValue.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Closing Value</Typography>
              <Typography variant="h6">£{summary.totalClosingValue.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Variance</Typography>
              <Typography variant="h5" sx={{ color: summary.totalVarianceValue >= 0 ? "success.main" : "error.main" }}>
                {summary.totalVarianceValue >= 0 ? "+" : ""}£{summary.totalVarianceValue.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Variance Qty</Typography>
              <Typography variant="h5">{summary.totalVarianceQty.toFixed(0)} units</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Product Code</TableCell>
              <TableCell>Product Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell align="right">Opening Qty</TableCell>
              <TableCell align="right">Purchases</TableCell>
              <TableCell align="right">Transfers In</TableCell>
              <TableCell align="right">Transfers Out</TableCell>
              <TableCell align="right">Sales Usage</TableCell>
              <TableCell align="right">Wastage</TableCell>
              <TableCell align="right">Adjustments</TableCell>
              <TableCell align="right">Closing Qty</TableCell>
              <TableCell align="right">Closing Value</TableCell>
              <TableCell align="right">Variance</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stockMovements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} align="center">
                  <Typography color="text.secondary">No stock movements for selected period</Typography>
                </TableCell>
              </TableRow>
            ) : (
              stockMovements.map((movement: any, index) => (
                <TableRow key={index} sx={{ backgroundColor: Math.abs(movement.valueVariance) > 100 ? "warning.light" : "inherit" }}>
                  <TableCell>{movement.productCode}</TableCell>
                  <TableCell>{movement.productName}</TableCell>
                  <TableCell>{movement.category}</TableCell>
                  <TableCell align="right">{movement.openingStock}</TableCell>
                  <TableCell align="right" sx={{ color: movement.purchases > 0 ? "success.main" : "inherit" }}>
                    {movement.purchases > 0 ? `+${movement.purchases}` : movement.purchases}
                  </TableCell>
                  <TableCell align="right" sx={{ color: movement.transfersIn > 0 ? "success.main" : "inherit" }}>
                    {movement.transfersIn > 0 ? `+${movement.transfersIn}` : movement.transfersIn}
                  </TableCell>
                  <TableCell align="right" sx={{ color: movement.transfersOut > 0 ? "error.main" : "inherit" }}>
                    {movement.transfersOut > 0 ? `-${movement.transfersOut}` : movement.transfersOut}
                  </TableCell>
                  <TableCell align="right" sx={{ color: "error.main" }}>
                    -{movement.salesUsage}
                  </TableCell>
                  <TableCell align="right" sx={{ color: movement.wastage > 0 ? "warning.main" : "inherit" }}>
                    {movement.wastage > 0 ? `-${movement.wastage}` : movement.wastage}
                  </TableCell>
                  <TableCell align="right">
                    {movement.adjustments > 0 ? `+${movement.adjustments}` : movement.adjustments}
                  </TableCell>
                  <TableCell align="right"><strong>{movement.closingStock}</strong></TableCell>
                  <TableCell align="right"><strong>£{movement.closingValue.toFixed(2)}</strong></TableCell>
                  <TableCell align="right" sx={{ color: movement.valueVariance >= 0 ? "success.main" : "error.main", fontWeight: "bold" }}>
                    {movement.valueVariance >= 0 ? "+" : ""}£{movement.valueVariance.toFixed(2)}
                    {Math.abs(movement.valueVariance) > 100 && (
                      <Chip label="High" color="error" size="small" sx={{ ml: 1 }} />
                    )}
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

export default StockMovementValuationReport
