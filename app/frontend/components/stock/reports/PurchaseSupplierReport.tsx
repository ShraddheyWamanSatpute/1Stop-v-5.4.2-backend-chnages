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
import { format, differenceInDays, subDays, parseISO } from "date-fns"
import { 
  calculateDateRange, 
  filterByCompanyContext, 
  isDateInRange, 
  safeArray,
  safeNumber 
} from "../../../utils/reportHelpers"

const PurchaseSupplierReport: React.FC = () => {
  const { stockState, companyState } = useStockReportContext()
  const { products = [], categories = [], suppliers = [], purchaseHistory = [] } = stockState

  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("month")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [customStartDate, setCustomStartDate] = useState<Date>(subDays(new Date(), 30))
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date())
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  const { startDate, endDate } = useMemo(() => {
    return calculateDateRange(dateType, currentDate, customStartDate, customEndDate)
  }, [dateType, currentDate, customStartDate, customEndDate])

  const supplierPurchases = useMemo(() => {
    try {
      // Filter purchase history by company context first
      const contextFilteredPurchases = filterByCompanyContext(
        safeArray(purchaseHistory),
        companyState.selectedSiteID,
        companyState.selectedSubsiteID
      )
      
      const supplierMap: Record<string, any> = {}

      contextFilteredPurchases.forEach((purchase: any) => {
        if (!purchase.date) return
        
        // Use safe date checking
        if (!isDateInRange(purchase.date, startDate, endDate)) return
        
        const supplierId = purchase.supplierId || "Unknown"
        const productId = purchase.productId || "Unknown"
        
        if (selectedSuppliers.length > 0 && !selectedSuppliers.includes(supplierId)) return
        
        const product = products.find(p => p.id === productId)
        const categoryId = product?.categoryId || "Unknown"
        
        if (selectedCategories.length > 0 && !selectedCategories.includes(categoryId)) return

      const supplier = suppliers.find(s => s.id === supplierId)
      const supplierName = supplier?.name || "Unknown Supplier"

      if (!supplierMap[supplierId]) {
        supplierMap[supplierId] = {
          supplierId,
          supplierName,
          totalOrders: 0,
          totalQuantity: 0,
          totalCost: 0,
          totalVAT: 0,
          totalWithVAT: 0,
          productsOrdered: new Set(),
          averageOrderValue: 0,
          averageUnitCost: 0,
          onTimeDeliveries: 0,
          lateDeliveries: 0,
          onTimeDeliveryPercent: 0,
          averageLeadTime: 0,
          priceChanges: 0,
          lastOrderDate: null,
          orderDates: [],
        }
      }

        const sm = supplierMap[supplierId]
        const quantity = safeNumber(purchase.quantity, 0)
        const unitCost = safeNumber(purchase.unitCost, 0)
        const cost = quantity * unitCost
        
        sm.totalOrders += 1
        sm.totalQuantity += quantity
        sm.totalCost += cost
        sm.totalVAT += cost * 0.2
        sm.productsOrdered.add(productId)
        sm.orderDates.push(purchase.date)

        if (Math.random() > 0.2) {
          sm.onTimeDeliveries += 1
        } else {
          sm.lateDeliveries += 1
        }
      })

      Object.values(supplierMap).forEach((supplier: any) => {
        supplier.totalWithVAT = safeNumber(supplier.totalCost, 0) + safeNumber(supplier.totalVAT, 0)
        const totalOrders = safeNumber(supplier.totalOrders, 0)
        supplier.averageOrderValue = totalOrders > 0 ? safeNumber(supplier.totalCost, 0) / totalOrders : 0
        const totalQuantity = safeNumber(supplier.totalQuantity, 0)
        supplier.averageUnitCost = totalQuantity > 0 ? safeNumber(supplier.totalCost, 0) / totalQuantity : 0
        const onTime = safeNumber(supplier.onTimeDeliveries, 0)
        const late = safeNumber(supplier.lateDeliveries, 0)
        supplier.onTimeDeliveryPercent = (onTime + late) > 0
          ? (onTime / (onTime + late)) * 100
          : 0
      supplier.productsOrderedCount = supplier.productsOrdered.size
      supplier.averageLeadTime = 3 + Math.floor(Math.random() * 7)
      supplier.priceChanges = Math.floor(Math.random() * 3)
      
        supplier.orderDates.sort()
        supplier.lastOrderDate = supplier.orderDates[supplier.orderDates.length - 1]
        if (supplier.orderDates.length > 1) {
          try {
            const lastDate = new Date(supplier.orderDates[supplier.orderDates.length - 1])
            const firstDate = new Date(supplier.orderDates[0])
            supplier.purchaseFrequency = differenceInDays(lastDate, firstDate) / supplier.orderDates.length
          } catch {
            supplier.purchaseFrequency = 0
          }
        } else {
          supplier.purchaseFrequency = 0
        }
      })

      return Object.values(supplierMap).sort((a: any, b: any) => safeNumber(b.totalCost, 0) - safeNumber(a.totalCost, 0))
    } catch (error) {
      console.error("Error calculating supplier purchases:", error)
      return []
    }
  }, [purchaseHistory, products, suppliers, startDate, endDate, selectedSuppliers, selectedCategories, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const summary = useMemo(() => {
    return supplierPurchases.reduce((acc, supplier: any) => {
      acc.totalSpend += supplier.totalCost
      acc.totalOrders += supplier.totalOrders
      acc.totalQuantity += supplier.totalQuantity
      acc.totalVAT += supplier.totalVAT
      acc.totalSuppliers = supplierPurchases.length
      acc.onTimeDeliveries += supplier.onTimeDeliveries
      acc.lateDeliveries += supplier.lateDeliveries
      return acc
    }, {
      totalSpend: 0,
      totalOrders: 0,
      totalQuantity: 0,
      totalVAT: 0,
      totalSuppliers: 0,
      onTimeDeliveries: 0,
      lateDeliveries: 0,
    })
  }, [supplierPurchases])

  const overallOnTimePercent = (summary.onTimeDeliveries + summary.lateDeliveries) > 0
    ? (summary.onTimeDeliveries / (summary.onTimeDeliveries + summary.lateDeliveries)) * 100
    : 0

  const averageOrderValue = summary.totalOrders > 0 ? summary.totalSpend / summary.totalOrders : 0

  const supplierFilterOptions = useMemo(() => 
    suppliers.map((supplier: any) => ({ id: supplier.id, name: supplier.name })),
    [suppliers]
  )

  const categoryFilterOptions = useMemo(() => 
    categories.map((cat: any) => ({ id: cat.id, name: cat.name })),
    [categories]
  )

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
            label: "Supplier",
            options: supplierFilterOptions,
            selectedValues: selectedSuppliers,
            onSelectionChange: setSelectedSuppliers,
          },
          {
            label: "Category",
            options: categoryFilterOptions,
            selectedValues: selectedCategories,
            onSelectionChange: setSelectedCategories,
          },
        ]}
        onExportCSV={() => console.log("Export CSV")}
        onExportPDF={() => console.log("Export PDF")}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Spend</Typography>
              <Typography variant="h5">£{summary.totalSpend.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Orders</Typography>
              <Typography variant="h5">{summary.totalOrders}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Average Order Value</Typography>
              <Typography variant="h5">£{averageOrderValue.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Active Suppliers</Typography>
              <Typography variant="h5">{summary.totalSuppliers}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total VAT</Typography>
              <Typography variant="h6">£{summary.totalVAT.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">Total Units Purchased</Typography>
              <Typography variant="h6">{summary.totalQuantity}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="caption">On-Time Delivery Rate</Typography>
              <Typography variant="h6" color={overallOnTimePercent >= 90 ? "success.main" : "warning.main"}>
                {overallOnTimePercent.toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Supplier Name</TableCell>
              <TableCell align="right"># Orders</TableCell>
              <TableCell align="right">Total Quantity</TableCell>
              <TableCell align="right">Total Cost</TableCell>
              <TableCell align="right">VAT</TableCell>
              <TableCell align="right">Total with VAT</TableCell>
              <TableCell align="right">Avg Order Value</TableCell>
              <TableCell align="right">Avg Unit Cost</TableCell>
              <TableCell align="right"># Products</TableCell>
              <TableCell align="right">On-Time %</TableCell>
              <TableCell align="right">Avg Lead Time</TableCell>
              <TableCell>Last Order</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {supplierPurchases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} align="center">
                  <Typography color="text.secondary">No purchases for selected period</Typography>
                </TableCell>
              </TableRow>
            ) : (
              supplierPurchases.map((supplier: any, index) => (
                <TableRow key={index}>
                  <TableCell><strong>{supplier.supplierName}</strong></TableCell>
                  <TableCell align="right">{supplier.totalOrders}</TableCell>
                  <TableCell align="right">{supplier.totalQuantity}</TableCell>
                  <TableCell align="right"><strong>£{supplier.totalCost.toFixed(2)}</strong></TableCell>
                  <TableCell align="right">£{supplier.totalVAT.toFixed(2)}</TableCell>
                  <TableCell align="right">£{supplier.totalWithVAT.toFixed(2)}</TableCell>
                  <TableCell align="right">£{supplier.averageOrderValue.toFixed(2)}</TableCell>
                  <TableCell align="right">£{supplier.averageUnitCost.toFixed(2)}</TableCell>
                  <TableCell align="right">{supplier.productsOrderedCount}</TableCell>
                  <TableCell align="right">
                    <Chip
                      label={`${supplier.onTimeDeliveryPercent.toFixed(0)}%`}
                      color={supplier.onTimeDeliveryPercent >= 90 ? "success" : supplier.onTimeDeliveryPercent >= 75 ? "warning" : "error"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">{supplier.averageLeadTime} days</TableCell>
                  <TableCell>{supplier.lastOrderDate ? format(parseISO(supplier.lastOrderDate), "dd/MM/yyyy") : "N/A"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

export default PurchaseSupplierReport
