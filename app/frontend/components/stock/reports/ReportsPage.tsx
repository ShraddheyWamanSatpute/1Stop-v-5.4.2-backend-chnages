"use client"

import React, { useState } from "react"
import { useLocation } from "react-router-dom"
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
} from "@mui/material"
import {
  Receipt as ReceiptIcon,
  AttachMoney as MoneyIcon,
  AccountBalance as BankIcon,
  Inventory as InventoryIcon,
  LocalOffer as OfferIcon,
  MoveToInbox as MoveIcon,
  ShoppingCart as CartIcon,
  TrendingUp as TrendingIcon,
} from "@mui/icons-material"
import CRUDModal, { type CRUDModalCloseReason, isCrudModalHardDismiss } from "../../reusable/CRUDModal"
import { usePOSReportContext, useStockReportContext } from "../../../../backend/context/AnalyticsContext"

// Import individual report components
import SalesSummaryReport from "./SalesSummaryReport"
import TillCashReconciliationReport from "./TillCashReconciliationReport"
import BankingDepositReport from "./BankingDepositReport"
import ProductSalesAnalysisReport from "./ProductSalesAnalysisReport"
import DiscountsPromotionsReport from "./DiscountsPromotionsReport"
import StockMovementValuationReport from "./StockMovementValuationReport"
import PurchaseSupplierReport from "./PurchaseSupplierReport"
import CostMarginAnalysisReport from "./CostMarginAnalysisReport"

interface Report {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  category: "pos" | "stock" | "combined"
  component: React.FC
}

const REPORTS: Report[] = [
  {
    id: "sales-summary",
    name: "Sales Summary Report",
    description: "Overview of all POS sales activity with gross sales, net sales, discounts, and transaction metrics",
    icon: <ReceiptIcon fontSize="large" />,
    category: "pos",
    component: SalesSummaryReport,
  },
  {
    id: "till-cash",
    name: "Till Cash Reconciliation",
    description: "Track and reconcile till cash, floats, and variances with expected vs. actual cash",
    icon: <MoneyIcon fontSize="large" />,
    category: "pos",
    component: TillCashReconciliationReport,
  },
  {
    id: "banking-deposit",
    name: "Banking & Deposit Summary",
    description: "Connect till data to end-of-day or period banking with deposits and reconciliation",
    icon: <BankIcon fontSize="large" />,
    category: "pos",
    component: BankingDepositReport,
  },
  {
    id: "product-sales",
    name: "Product Sales Analysis",
    description: "Detailed POS item-level performance with quantity sold, net/gross value, and margin analysis",
    icon: <InventoryIcon fontSize="large" />,
    category: "pos",
    component: ProductSalesAnalysisReport,
  },
  {
    id: "discounts-promotions",
    name: "Discounts & Promotions",
    description: "Monitor discounts, voids, and promotions affecting sales with redemption rates",
    icon: <OfferIcon fontSize="large" />,
    category: "pos",
    component: DiscountsPromotionsReport,
  },
  {
    id: "stock-movement",
    name: "Stock Movement & Valuation",
    description: "Track real-time stock and movement between locations with opening stock, transfers, and variances",
    icon: <MoveIcon fontSize="large" />,
    category: "stock",
    component: StockMovementValuationReport,
  },
  {
    id: "purchase-supplier",
    name: "Purchase & Supplier Report",
    description: "Monitor purchasing activity and supplier performance with cost analysis",
    icon: <CartIcon fontSize="large" />,
    category: "stock",
    component: PurchaseSupplierReport,
  },
  {
    id: "cost-margin",
    name: "Cost & Margin Analysis",
    description: "Combine stock and POS data to analyze profit, COGS, gross profit %, and waste cost",
    icon: <TrendingIcon fontSize="large" />,
    category: "combined",
    component: CostMarginAnalysisReport,
  },
]

const ReportsPage: React.FC = () => {
  const location = useLocation()
  const { stockState } = useStockReportContext()
  const { posState } = usePOSReportContext()
  const { dataVersion: stockDataVersion, loading: stockLoading } = stockState
  const { loading: posLoading } = posState || {}

  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [reportModalOpen, setReportModalOpen] = useState(false)

  const handleOpenReport = (report: Report) => {
    setSelectedReport(report)
    setReportModalOpen(true)
  }

  const handleCloseReport = (reason?: CRUDModalCloseReason) => {
    void location.pathname
    setReportModalOpen(false)
    if (isCrudModalHardDismiss(reason)) {
      setSelectedReport(null)
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "pos":
        return "primary"
      case "stock":
        return "secondary"
      case "combined":
        return "success"
      default:
        return "default"
    }
  }

  return (
    <>
      {/* Loading overlay */}
      {(stockLoading || posLoading) && (
        <Box
          sx={{
            position: 'fixed',
            top: 80,
            right: 16,
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1,
            bgcolor: 'info.light',
            borderRadius: 1,
            boxShadow: 2,
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 500 }}>
            Refreshing data... (v{stockDataVersion})
          </Typography>
        </Box>
      )}

      <Grid container spacing={3} sx={{ opacity: stockLoading || posLoading ? 0.7 : 1, transition: 'opacity 0.3s', pt: 2 }}>
        {REPORTS.map((report) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={report.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: `${getCategoryColor(report.category)}.light`,
                      color: `${getCategoryColor(report.category)}.main`,
                    }}
                  >
                    {report.icon}
                  </Box>
                  <Chip
                    label={report.category.toUpperCase()}
                    size="small"
                    color={getCategoryColor(report.category)}
                    variant="outlined"
                  />
                </Box>
                <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
                  {report.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ minHeight: 60 }}>
                  {report.description}
                </Typography>
              </CardContent>
              <CardActions sx={{ p: 2, pt: 0 }}>
                <Button
                  size="small"
                  variant="contained"
                  fullWidth
                  onClick={() => handleOpenReport(report)}
                >
                  Open Report
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Report Modal */}
      <CRUDModal
        open={reportModalOpen}
        onClose={handleCloseReport}
        workspaceFormShortcut={{
          crudEntity: "analyticsReportViewer",
          crudMode: "view",
          id: selectedReport?.id,
          itemLabel: selectedReport?.name,
        }}
        title={selectedReport?.name}
        icon={selectedReport?.icon}
        maxWidth="xl"
        mode="view"
        hideCloseAction={true}
      >
        {selectedReport && React.createElement(selectedReport.component)}
      </CRUDModal>
    </>
  )
}

export default ReportsPage

