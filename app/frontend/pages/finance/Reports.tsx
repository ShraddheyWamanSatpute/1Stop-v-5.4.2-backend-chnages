"use client"

import { useState, useEffect, useMemo } from "react"
import { useLocation } from "react-router-dom"
import type React from "react"
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Autocomplete,
  Tabs,
  Tab,
  Divider,
  IconButton,
} from "@mui/material"
import {
  BarChart,
  TrendingUp,
  AttachMoney as DollarSign,
  Description as FileText,
  PieChart,
  Download,
  Print,
  Close,
} from "@mui/icons-material"
import { useFinanceReportContext } from "../../../backend/context/AnalyticsContext"
import DataHeader from "../../components/reusable/DataHeader"
import type { Invoice, BankAccount, Expense, Account, Dimension, Budget } from "../../../backend/interfaces/Finance"
import { usePermission } from "../../hooks/usePermission"
import {
  filterByCompanyContext,
  safeArray,
  safeNumber,
  safeString,
} from "../../utils/reportHelpers"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../components/reusable/CRUDModal"
import EmptyStateCard from "../../components/reusable/EmptyStateCard"

interface ReportDialogState {
  open: boolean
  reportType: string | null
  startDate: string
  endDate: string
  asOfDate: string
  accountId: string
  dimensionIds: Record<string, string>
  taxRateId: string
  budgetId: string
  period: string
  comparativePeriod: boolean
  reportData: any
  loading: boolean
}

const Reports: React.FC = () => {
  const location = useLocation()
  const [searchTerm, setSearchTerm] = useState("")
  const { canEdit } = usePermission()
  const canMutate = canEdit("finance", "reports")
  const { finance, financeState, companyState } = useFinanceReportContext()
  const {
    refreshAll,
    generateProfitLoss,
    generateBalanceSheet,
    generateCashFlow,
    generateTrialBalance,
    generateGeneralLedger,
    generateARAging,
    generateAPAging,
    generateTaxReport,
    generateBudgetVsActual,
  } = finance

  // Date management
  const [currentDate, setCurrentDate] = useState(new Date())
  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("month")

  // Filter states
  const [reportTypeFilter, setReportTypeFilter] = useState("All")
  const [createReportDialogOpen, setCreateReportDialogOpen] = useState(false)

  // Report dialog state
  const [reportDialog, setReportDialog] = useState<ReportDialogState>({
    open: false,
    reportType: null,
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    asOfDate: new Date().toISOString().split("T")[0],
    accountId: "",
    dimensionIds: {},
    taxRateId: "",
    budgetId: "",
    period: "",
    comparativePeriod: false,
    reportData: null,
    loading: false,
  })

  const [reportTab, setReportTab] = useState(0)

  // Note: Finance data is loaded automatically by FinanceContext
  useEffect(() => {
    if (financeState.basePath && financeState.accounts.length === 0 && !financeState.loading) {
      refreshAll()
    }
  }, [financeState.basePath, financeState.accounts.length, financeState.loading, refreshAll])

  const reportCategories = [
    {
      title: "Financial Statements",
      reports: [
        {
          name: "Profit & Loss",
          description: "Income and expenses summary",
          icon: TrendingUp,
          frequency: "Monthly",
          type: "profit_loss",
        },
        {
          name: "Balance Sheet",
          description: "Assets, liabilities, and equity",
          icon: DollarSign,
          frequency: "Monthly",
          type: "balance_sheet",
        },
        {
          name: "Cash Flow Statement",
          description: "Cash inflows and outflows",
          icon: BarChart,
          frequency: "Monthly",
          type: "cash_flow",
        },
        {
          name: "Trial Balance",
          description: "Account balances verification",
          icon: FileText,
          frequency: "Monthly",
          type: "trial_balance",
        },
        {
          name: "General Ledger",
          description: "Account-level transaction details",
          icon: FileText,
          frequency: "Monthly",
          type: "general_ledger",
        },
      ],
    },
    {
      title: "Sales Reports",
      reports: [
        {
          name: "AR Aging",
          description: "Outstanding invoice analysis",
          icon: FileText,
          frequency: "Weekly",
          type: "ar_aging",
        },
        {
          name: "Tax Report",
          description: "Tax collected and payable",
          icon: DollarSign,
          frequency: "Quarterly",
          type: "tax_report",
        },
      ],
    },
    {
      title: "Purchase Reports",
      reports: [
        {
          name: "AP Aging",
          description: "Outstanding bills analysis",
          icon: FileText,
          frequency: "Weekly",
          type: "ap_aging",
        },
      ],
    },
    {
      title: "Budget Reports",
      reports: [
        {
          name: "Budget vs Actual",
          description: "Compare budgeted vs actual amounts",
          icon: TrendingUp,
          frequency: "Monthly",
          type: "budget_vs_actual",
        },
      ],
    },
  ]

  // Calculate report data from financeState with company context filtering
  const filteredInvoices = useMemo((): Invoice[] => {
    try {
      return filterByCompanyContext<Invoice>(
        safeArray(financeState.invoices),
        companyState.selectedSiteID,
        companyState.selectedSubsiteID,
      )
    } catch (error) {
      // Error filtering invoices - handled by context
      return []
    }
  }, [financeState.invoices, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const filteredBankAccounts = useMemo((): BankAccount[] => {
    try {
      return filterByCompanyContext<BankAccount>(
        safeArray(financeState.bankAccounts),
        companyState.selectedSiteID,
        companyState.selectedSubsiteID,
      )
    } catch (error) {
      // Error filtering bank accounts - handled by context
      return []
    }
  }, [financeState.bankAccounts, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const filteredExpenses = useMemo((): Expense[] => {
    try {
      return filterByCompanyContext<Expense>(
        safeArray(financeState.expenses),
        companyState.selectedSiteID,
        companyState.selectedSubsiteID,
      )
    } catch (error) {
      // Error filtering expenses - handled by context
      return []
    }
  }, [financeState.expenses, companyState.selectedSiteID, companyState.selectedSubsiteID])

  // Calculate financial metrics
  const todaySales = useMemo(() => {
    try {
      const today = new Date().toISOString().split("T")[0]
      return filteredInvoices
        .filter((inv) => {
          return (
            (inv.issueDate && inv.issueDate.split("T")[0] === today) ||
            (inv.dueDate && inv.dueDate.split("T")[0] === today)
          )
        })
        .reduce((sum, inv) => sum + safeNumber(inv.totalAmount, 0), 0)
    } catch (error) {
      // Error calculating today's sales - handled by context
      return 0
    }
  }, [filteredInvoices])

  const outstandingInvoices = useMemo(() => {
    try {
      return filteredInvoices
        .filter((inv) => safeString(inv.status) !== "paid")
        .reduce((sum, inv) => sum + safeNumber(inv.totalAmount, 0), 0)
    } catch (error) {
      // Error calculating outstanding invoices - handled by context
      return 0
    }
  }, [filteredInvoices])

  const cashBalance = useMemo(() => {
    try {
      return filteredBankAccounts.reduce((sum, account) => sum + safeNumber(account.balance, 0), 0)
    } catch (error) {
      // Error calculating cash balance - handled by context
      return 0
    }
  }, [filteredBankAccounts])

  const monthlyExpenses = useMemo(() => {
    try {
      return filteredExpenses
        .filter((exp) => {
          const expenseDate = new Date(exp.submitDate || "")
          const currentMonth = new Date().getMonth()
          const currentYear = new Date().getFullYear()
          return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear
        })
        .reduce((sum, exp) => sum + safeNumber(exp.amount, 0), 0)
    } catch (error) {
      // Error calculating monthly expenses - handled by context
      return 0
    }
  }, [filteredExpenses])

  const handleGenerateReport = async (reportType: string) => {
    setReportDialog({
      ...reportDialog,
      open: true,
      reportType,
      reportData: null,
      loading: false,
    })
  }

  const handleRunReport = async () => {
    if (!reportDialog.reportType) return

    setReportDialog({ ...reportDialog, loading: true })

    try {
      let data: any = null

      switch (reportDialog.reportType) {
        case "profit_loss":
          data = await generateProfitLoss(
            reportDialog.startDate,
            reportDialog.endDate,
            Object.keys(reportDialog.dimensionIds).length > 0 ? reportDialog.dimensionIds : undefined,
          )
          break
        case "balance_sheet":
          data = await generateBalanceSheet(
            reportDialog.asOfDate,
            Object.keys(reportDialog.dimensionIds).length > 0 ? reportDialog.dimensionIds : undefined,
          )
          break
        case "cash_flow":
          data = await generateCashFlow(reportDialog.startDate, reportDialog.endDate)
          break
        case "trial_balance":
          data = await generateTrialBalance(reportDialog.asOfDate)
          break
        case "general_ledger":
          if (!reportDialog.accountId) {
            alert("Please select an account")
            setReportDialog({ ...reportDialog, loading: false })
            return
          }
          data = await generateGeneralLedger(
            reportDialog.accountId,
            reportDialog.startDate,
            reportDialog.endDate,
          )
          break
        case "ar_aging":
          data = await generateARAging(reportDialog.asOfDate)
          break
        case "ap_aging":
          data = await generateAPAging(reportDialog.asOfDate)
          break
        case "tax_report":
          data = await generateTaxReport(
            reportDialog.startDate,
            reportDialog.endDate,
            reportDialog.taxRateId || undefined,
          )
          break
        case "budget_vs_actual":
          if (!reportDialog.budgetId) {
            alert("Please select a budget")
            setReportDialog({ ...reportDialog, loading: false })
            return
          }
          data = await generateBudgetVsActual(reportDialog.budgetId, reportDialog.period || undefined)
          break
      }

      setReportDialog({
        ...reportDialog,
        reportData: data,
        loading: false,
      })
    } catch (error) {
      // Error generating report - handled by context
      alert("Failed to generate report. Please try again.")
      setReportDialog({ ...reportDialog, loading: false })
    }
  }

  const handleExportReport = () => {
    // TODO: Implement export functionality
    alert("Export functionality will be implemented")
  }

  const renderReportContent = () => {
    if (!reportDialog.reportData) return null

    const { reportType, reportData } = reportDialog

    switch (reportType) {
      case "profit_loss":
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Profit & Loss Report
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Period: {new Date(reportDialog.startDate).toLocaleDateString()} -{" "}
              {new Date(reportDialog.endDate).toLocaleDateString()}
            </Typography>
            <Divider sx={{ my: 2 }} />
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Account</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <Typography variant="subtitle2">Revenue</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2">£{reportData.revenue?.total?.toFixed(2) || "0.00"}</Typography>
                    </TableCell>
                  </TableRow>
                  {reportData.revenue?.accounts?.map((item: any) => (
                    <TableRow key={item.account.id}>
                      <TableCell sx={{ pl: 4 }}>{item.account.name}</TableCell>
                      <TableCell align="right">£{item.amount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell>
                      <Typography variant="subtitle2">Cost of Sales</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2">£{reportData.costOfSales?.total?.toFixed(2) || "0.00"}</Typography>
                    </TableCell>
                  </TableRow>
                  {reportData.costOfSales?.accounts?.map((item: any) => (
                    <TableRow key={item.account.id}>
                      <TableCell sx={{ pl: 4 }}>{item.account.name}</TableCell>
                      <TableCell align="right">£{item.amount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell>
                      <Typography variant="subtitle2">Gross Profit</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2" color="success.main">
                        £{reportData.grossProfit?.toFixed(2) || "0.00"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Typography variant="subtitle2">Expenses</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2">£{reportData.expenses?.total?.toFixed(2) || "0.00"}</Typography>
                    </TableCell>
                  </TableRow>
                  {reportData.expenses?.accounts?.map((item: any) => (
                    <TableRow key={item.account.id}>
                      <TableCell sx={{ pl: 4 }}>{item.account.name}</TableCell>
                      <TableCell align="right">£{item.amount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell>
                      <Typography variant="h6">Net Profit</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="h6" color={reportData.netProfit >= 0 ? "success.main" : "error.main"}>
                        £{reportData.netProfit?.toFixed(2) || "0.00"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )

      case "balance_sheet":
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Balance Sheet
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              As of: {new Date(reportDialog.asOfDate).toLocaleDateString()}
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  Assets
                </Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Account</TableCell>
                        <TableCell align="right">Balance</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reportData.assets?.accounts?.map((item: any) => (
                        <TableRow key={item.account.id}>
                          <TableCell>{item.account.name}</TableCell>
                          <TableCell align="right">£{item.balance.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell>
                          <Typography variant="subtitle2">Total Assets</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="subtitle2">£{reportData.assets?.total?.toFixed(2) || "0.00"}</Typography>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  Liabilities & Equity
                </Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Account</TableCell>
                        <TableCell align="right">Balance</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reportData.liabilities?.accounts?.map((item: any) => (
                        <TableRow key={item.account.id}>
                          <TableCell>{item.account.name}</TableCell>
                          <TableCell align="right">£{item.balance.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      {reportData.equity?.accounts?.map((item: any) => (
                        <TableRow key={item.account.id}>
                          <TableCell>{item.account.name}</TableCell>
                          <TableCell align="right">£{item.balance.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell>
                          <Typography variant="subtitle2">Total Liabilities & Equity</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="subtitle2">
                            £{reportData.totalLiabilitiesAndEquity?.toFixed(2) || "0.00"}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          </Box>
        )

      case "trial_balance":
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Trial Balance
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              As of: {new Date(reportDialog.asOfDate).toLocaleDateString()}
            </Typography>
            <Chip
              label={reportData.isBalanced ? "Balanced" : "Not Balanced"}
              color={reportData.isBalanced ? "success" : "error"}
              sx={{ mb: 2 }}
            />
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Account</TableCell>
                    <TableCell align="right">Debit</TableCell>
                    <TableCell align="right">Credit</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.accounts?.map((item: any) => (
                    <TableRow key={item.account.id}>
                      <TableCell>
                        {item.account.code} - {item.account.name}
                      </TableCell>
                      <TableCell align="right">£{item.debit.toFixed(2)}</TableCell>
                      <TableCell align="right">£{item.credit.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell>
                      <Typography variant="subtitle2">Totals</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2">£{reportData.totalDebits?.toFixed(2) || "0.00"}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2">£{reportData.totalCredits?.toFixed(2) || "0.00"}</Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )

      case "ar_aging":
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Accounts Receivable Aging
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              As of: {new Date(reportDialog.asOfDate).toLocaleDateString()}
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6} sm={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">
                      Current
                    </Typography>
                    <Typography variant="h6">£{reportData.agingBuckets?.current?.toFixed(2) || "0.00"}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">
                      1-30 Days
                    </Typography>
                    <Typography variant="h6">£{reportData.agingBuckets?.days30?.toFixed(2) || "0.00"}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">
                      31-60 Days
                    </Typography>
                    <Typography variant="h6">£{reportData.agingBuckets?.days60?.toFixed(2) || "0.00"}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">
                      61-90 Days
                    </Typography>
                    <Typography variant="h6">£{reportData.agingBuckets?.days90?.toFixed(2) || "0.00"}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Invoice</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell align="right">Days Past Due</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.invoices?.map((item: any) => (
                    <TableRow key={item.invoice.id}>
                      <TableCell>{item.invoice.invoiceNumber}</TableCell>
                      <TableCell>{item.invoice.customerName}</TableCell>
                      <TableCell>{new Date(item.invoice.dueDate).toLocaleDateString()}</TableCell>
                      <TableCell align="right">{item.daysPastDue}</TableCell>
                      <TableCell align="right">£{item.balance.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )

      case "ap_aging":
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Accounts Payable Aging
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              As of: {new Date(reportDialog.asOfDate).toLocaleDateString()}
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6} sm={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">
                      Current
                    </Typography>
                    <Typography variant="h6">£{reportData.agingBuckets?.current?.toFixed(2) || "0.00"}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">
                      1-30 Days
                    </Typography>
                    <Typography variant="h6">£{reportData.agingBuckets?.days30?.toFixed(2) || "0.00"}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">
                      31-60 Days
                    </Typography>
                    <Typography variant="h6">£{reportData.agingBuckets?.days60?.toFixed(2) || "0.00"}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">
                      61-90 Days
                    </Typography>
                    <Typography variant="h6">£{reportData.agingBuckets?.days90?.toFixed(2) || "0.00"}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Bill</TableCell>
                    <TableCell>Supplier</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell align="right">Days Past Due</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.bills?.map((item: any) => (
                    <TableRow key={item.bill.id}>
                      <TableCell>{item.bill.billNumber}</TableCell>
                      <TableCell>{item.bill.supplierName}</TableCell>
                      <TableCell>{new Date(item.bill.dueDate).toLocaleDateString()}</TableCell>
                      <TableCell align="right">{item.daysPastDue}</TableCell>
                      <TableCell align="right">£{item.balance.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )

      case "tax_report":
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Tax Report
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Period: {new Date(reportDialog.startDate).toLocaleDateString()} -{" "}
              {new Date(reportDialog.endDate).toLocaleDateString()}
            </Typography>
            <Divider sx={{ my: 2 }} />
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Tax Rate</TableCell>
                    <TableCell align="right">Output Tax</TableCell>
                    <TableCell align="right">Input Tax</TableCell>
                    <TableCell align="right">Net Tax</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.taxByRate?.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{item.taxRate?.name || "Standard"} ({item.taxRate?.rate || 0}%)</TableCell>
                      <TableCell align="right">£{item.output?.toFixed(2) || "0.00"}</TableCell>
                      <TableCell align="right">£{item.input?.toFixed(2) || "0.00"}</TableCell>
                      <TableCell align="right">£{item.net?.toFixed(2) || "0.00"}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell>
                      <Typography variant="subtitle2">Totals</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2">
                        £{reportData.totals?.outputTax?.toFixed(2) || "0.00"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2">
                        £{reportData.totals?.inputTax?.toFixed(2) || "0.00"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2">
                        £{reportData.totals?.netTax?.toFixed(2) || "0.00"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )

      case "budget_vs_actual":
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Budget vs Actual
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Budget: {reportData.budget_name}
            </Typography>
            <Divider sx={{ my: 2 }} />
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Account</TableCell>
                    <TableCell>Period</TableCell>
                    <TableCell align="right">Budgeted</TableCell>
                    <TableCell align="right">Actual</TableCell>
                    <TableCell align="right">Variance</TableCell>
                    <TableCell align="right">Variance %</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.map((item: any) => (
                    <TableRow key={`${item.account_id}-${item.period}`}>
                      <TableCell>
                        {item.account_code} - {item.account_name}
                      </TableCell>
                      <TableCell>{item.period}</TableCell>
                      <TableCell align="right">£{item.budgeted_amount.toFixed(2)}</TableCell>
                      <TableCell align="right">£{item.actual_amount.toFixed(2)}</TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          color={item.variance >= 0 ? "success.main" : "error.main"}
                        >
                          £{item.variance.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          color={item.variance_percentage >= 0 ? "success.main" : "error.main"}
                        >
                          {item.variance_percentage.toFixed(1)}%
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )

      default:
        return (
          <Alert severity="info">Report data available. Display format will be implemented for this report type.</Alert>
        )
    }
  }

  return (
    <Box sx={{ pt: 3, width: "100%" }}>
      {financeState.error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => {}}>
          {financeState.error}
        </Alert>
      )}

      <DataHeader
        onRefresh={() => refreshAll().catch(() => {})}
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        dateType={dateType}
        onDateTypeChange={setDateType}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={[
          {
            label: "Report Type",
            options: [
              { id: "all", name: "All" },
              { id: "financial", name: "Financial Statements" },
              { id: "sales", name: "Sales Reports" },
              { id: "purchase", name: "Purchase Reports" },
              { id: "budget", name: "Budget Reports" },
            ],
            selectedValues: [reportTypeFilter],
            onSelectionChange: (values) => setReportTypeFilter(values[0] || "All"),
          },
        ]}
        sortOptions={[
          { label: "Name", value: "name" },
          { label: "Frequency", value: "frequency" },
          { label: "Category", value: "category" },
        ]}
        onSortChange={() => {}}
        onExportCSV={() => {}}
        onCreateNew={() => setCreateReportDialogOpen(true)}
        createButtonLabel="Custom Report"
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit reports."
      />

      <Box>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: "100%", boxShadow: 3, borderRadius: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Today's Sales
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  £{todaySales.toFixed(2)}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
                  Daily revenue
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: "100%", boxShadow: 3, borderRadius: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Outstanding Invoices
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="warning.main">
                  £{outstandingInvoices.toFixed(2)}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
                  Unpaid amounts
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: "100%", boxShadow: 3, borderRadius: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Cash Balance
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  £{cashBalance.toFixed(2)}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
                  Available funds
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: "100%", boxShadow: 3, borderRadius: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Monthly Expenses
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="error.main">
                  £{monthlyExpenses.toFixed(2)}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
                  Current month
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {reportCategories.map((category) => (
        <Box key={category.title}>
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                {category.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Essential reports for {category.title.toLowerCase()}
              </Typography>
              <Grid container spacing={3}>
                {category.reports
                  .filter(
                    (report) =>
                      report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      report.description.toLowerCase().includes(searchTerm.toLowerCase()),
                  )
                  .map((report) => (
                    <Grid item xs={12} sm={6} md={3} key={report.name}>
                      <Card
                        variant="outlined"
                        sx={{
                          cursor: "pointer",
                          "&:hover": { backgroundColor: "action.hover" },
                        }}
                        onClick={() => handleGenerateReport(report.type)}
                      >
                        <CardContent>
                          <Box sx={{ display: "flex", alignItems: "start", gap: 2 }}>
                            <report.icon color="primary" sx={{ mt: 0.5 }} />
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                                {report.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
                                {report.description}
                              </Typography>
                              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <Typography variant="caption" color="text.secondary">
                                  {report.frequency}
                                </Typography>
                                <Button size="small" variant="text" color="primary" sx={{ p: 0 }}>
                                  Generate
                                </Button>
                              </Box>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
              </Grid>
            </CardContent>
          </Card>
        </Box>
      ))}

      {/* Report Generation Dialog */}
      <Dialog
        open={reportDialog.open}
        onClose={() => setReportDialog({ ...reportDialog, open: false, reportData: null })}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6">
              {reportCategories
                .flatMap((cat) => cat.reports)
                .find((r) => r.type === reportDialog.reportType)?.name || "Generate Report"}
            </Typography>
            <Box>
              <Button
                startIcon={<Download />}
                onClick={handleExportReport}
                disabled={!reportDialog.reportData}
                sx={{ mr: 1 }}
              >
                Export
              </Button>
              <IconButton onClick={() => setReportDialog({ ...reportDialog, open: false, reportData: null })}>
                <Close />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {reportDialog.loading ? (
            <Box sx={{ py: 4, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Generating report…
              </Typography>
            </Box>
          ) : reportDialog.reportData ? (
            <Box>
              <Tabs value={reportTab} onChange={(_, v) => setReportTab(v)} sx={{ mb: 2 }}>
                <Tab label="Report" />
                <Tab label="Settings" />
              </Tabs>
              {reportTab === 0 ? (
                renderReportContent()
              ) : (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Report settings and filters can be adjusted here
                  </Typography>
                </Box>
              )}
            </Box>
          ) : (
            <Grid container spacing={3}>
              {(reportDialog.reportType === "profit_loss" ||
                reportDialog.reportType === "cash_flow" ||
                reportDialog.reportType === "tax_report") && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Start Date"
                      type="date"
                      value={reportDialog.startDate}
                      onChange={(e) => setReportDialog({ ...reportDialog, startDate: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="End Date"
                      type="date"
                      value={reportDialog.endDate}
                      onChange={(e) => setReportDialog({ ...reportDialog, endDate: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                </>
              )}

              {(reportDialog.reportType === "balance_sheet" ||
                reportDialog.reportType === "trial_balance" ||
                reportDialog.reportType === "ar_aging" ||
                reportDialog.reportType === "ap_aging") && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="As of Date"
                    type="date"
                    value={reportDialog.asOfDate}
                    onChange={(e) => setReportDialog({ ...reportDialog, asOfDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              )}

              {reportDialog.reportType === "general_ledger" && (
                <>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Account</InputLabel>
                      <Select
                        value={reportDialog.accountId}
                        onChange={(e) => setReportDialog({ ...reportDialog, accountId: e.target.value })}
                        label="Account"
                      >
                        {financeState.accounts.map((acc) => (
                          <MenuItem key={acc.id} value={acc.id}>
                            {acc.code} - {acc.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Start Date"
                      type="date"
                      value={reportDialog.startDate}
                      onChange={(e) => setReportDialog({ ...reportDialog, startDate: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="End Date"
                      type="date"
                      value={reportDialog.endDate}
                      onChange={(e) => setReportDialog({ ...reportDialog, endDate: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                </>
              )}

              {reportDialog.reportType === "tax_report" && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Tax Rate (Optional)</InputLabel>
                    <Select
                      value={reportDialog.taxRateId}
                      onChange={(e) => setReportDialog({ ...reportDialog, taxRateId: e.target.value })}
                      label="Tax Rate (Optional)"
                    >
                      <MenuItem value="">All Tax Rates</MenuItem>
                      {financeState.taxRates.map((tr) => (
                        <MenuItem key={tr.id} value={tr.id}>
                          {tr.name} ({tr.rate}%)
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {reportDialog.reportType === "budget_vs_actual" && (
                <>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Budget</InputLabel>
                      <Select
                        value={reportDialog.budgetId}
                        onChange={(e) => setReportDialog({ ...reportDialog, budgetId: e.target.value })}
                        label="Budget"
                      >
                        {financeState.budgets.filter((b) => b.is_active).map((budget) => (
                          <MenuItem key={budget.id} value={budget.id}>
                            {budget.name} (v{budget.version})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Period (Optional - YYYY-MM)"
                      value={reportDialog.period}
                      onChange={(e) => setReportDialog({ ...reportDialog, period: e.target.value })}
                      placeholder="2024-01"
                      helperText="Leave empty for all periods"
                    />
                  </Grid>
                </>
              )}

              {(reportDialog.reportType === "profit_loss" || reportDialog.reportType === "balance_sheet") && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Dimension Filtering (Optional)
                  </Typography>
                  {financeState.dimensions
                    .filter((d) => d.is_active)
                    .map((dimension) => (
                      <Autocomplete
                        key={dimension.id}
                        options={[]}
                        value={reportDialog.dimensionIds[dimension.id] || null}
                        onChange={(_, value) => {
                          setReportDialog({
                            ...reportDialog,
                            dimensionIds: {
                              ...reportDialog.dimensionIds,
                              [dimension.id]: value || "",
                            },
                          })
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label={dimension.name}
                            placeholder="Select value"
                            sx={{ mb: 2 }}
                          />
                        )}
                      />
                    ))}
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          {!reportDialog.reportData && (
            <Button onClick={() => setReportDialog({ ...reportDialog, open: false })}>Cancel</Button>
          )}
          {!reportDialog.reportData && (
            <Button variant="contained" onClick={handleRunReport} disabled={reportDialog.loading}>
              {reportDialog.loading ? "Generating..." : "Generate Report"}
            </Button>
          )}
          {reportDialog.reportData && (
            <Button onClick={() => setReportDialog({ ...reportDialog, reportData: null })}>New Report</Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Create Custom Report Modal */}
      <CRUDModal
        open={createReportDialogOpen}
        onClose={(reason) => {
          setCreateReportDialogOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            /* no entity state beyond dialog open */
          }
        }}
        workspaceFormShortcut={{ crudEntity: "financeCustomReport", crudMode: "create" }}
        mode="create"
        title="Create Custom Report"
        onSave={async (data: any) => {
          // TODO: Implement custom report creation
          // Creating custom report
          removeWorkspaceFormDraft(location.pathname, { crudEntity: "financeCustomReport", crudMode: "create" })
          setCreateReportDialogOpen(false)
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Custom report creation form will be implemented here
          </Typography>
        </Box>
      </CRUDModal>
    </Box>
  )
}

export default Reports
