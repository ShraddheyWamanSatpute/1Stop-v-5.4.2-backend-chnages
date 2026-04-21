"use client"

import { themeConfig } from "../../../theme/AppTheme";
import React, { useCallback, useState, useEffect } from "react"
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Alert,
  Divider,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material"
import {
  Download,
  Print,
  Share,
  TrendingUp,
  TrendingDown,
  Assessment,
  MoreVert,
  Visibility,
  Delete,
} from "@mui/icons-material"

import { useFinanceReportContext } from "../../../backend/context/AnalyticsContext"
import DataHeader from "../../components/reusable/DataHeader"
import AnimatedCounter from "../../components/reusable/AnimatedCounter"
import type { FinancialReport } from "../../../backend/interfaces/Finance"
import EmptyStateCard from "../../components/reusable/EmptyStateCard"

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  )
}

const Reporting: React.FC = () => {
  const { finance, financeState } = useFinanceReportContext()
  const { 
    refreshAccounts, 
    refreshTransactions,
    refreshReports,
    generateReport,
    deleteReport,
  } = finance
  
  const [currentDate, setCurrentDate] = useState(new Date())
  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("month")
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState(0)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedReport, setSelectedReport] = useState<FinancialReport | null>(null)

  const loadData = useCallback(async () => {
    await Promise.allSettled([refreshAccounts(), refreshTransactions(), refreshReports()])
  }, [refreshAccounts, refreshTransactions, refreshReports])

  useEffect(() => {
    // Attempt to reload if no data and not loading
    if (financeState.reports.length === 0 && !financeState.loading) {
      loadData().catch(() => {})
    }
  }, [financeState.reports.length, financeState.loading, loadData])

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, report: FinancialReport) => {
    setAnchorEl(event.currentTarget)
    setSelectedReport(report)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedReport(null)
  }

  const handleDeleteReport = async (report: FinancialReport) => {
    if (!window.confirm(`Are you sure you want to delete this report?`)) {
      return
    }

    try {
      await deleteReport(report.id)
      await refreshReports()
      handleMenuClose()
    } catch (error) {
      // Error deleting report - handled by context
      alert("Failed to delete report. Please try again.")
    }
  }

  const handleGenerateReport = async (reportType: string) => {
    try {
      await generateReport(reportType, {
        startDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString(),
        endDate: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString(),
      })
      await refreshReports()
    } catch (error) {
      // Error generating report - handled by context
      alert("Failed to generate report. Please try again.")
    }
  }

  // Calculate report data
  const accounts = financeState.accounts || []
  const transactions = financeState.transactions || []
  const reports = financeState.reports || []

  // Profit & Loss calculations
  const totalRevenue = accounts
    .filter(acc => acc.type === "revenue")
    .reduce((sum, acc) => sum + (acc.balance || 0), 0)
  
  const totalExpenses = Math.abs(
    accounts
      .filter(acc => acc.type === "expense")
      .reduce((sum, acc) => sum + (acc.balance || 0), 0)
  )
  
  const grossProfit = totalRevenue - totalExpenses
  const netProfit = grossProfit // Simplified for now

  // Balance Sheet calculations
  const totalAssets = accounts
    .filter(acc => acc.type === "asset")
    .reduce((sum, acc) => sum + (acc.balance || 0), 0)
  
  const totalLiabilities = Math.abs(
    accounts
      .filter(acc => acc.type === "liability")
      .reduce((sum, acc) => sum + (acc.balance || 0), 0)
  )
  
  const totalEquity = accounts
    .filter(acc => acc.type === "equity")
    .reduce((sum, acc) => sum + (acc.balance || 0), 0) + grossProfit

  // Cash Flow calculations
  const cashFlowOperating = transactions
    .filter(t => t.type === "sale" || t.type === "purchase")
    .reduce((sum, t) => sum + (t.totalAmount || 0), 0)
  
  const cashFlowInvesting = 0 // Placeholder
  const cashFlowFinancing = 0 // Placeholder
  const netCashFlow = cashFlowOperating + cashFlowInvesting + cashFlowFinancing


  return (
    <Box sx={{ width: "100%" }}>
      <DataHeader
        onRefresh={loadData}
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        dateType={dateType}
        onDateTypeChange={setDateType}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search reports..."
        showDateControls={true}
        showDateTypeSelector={true}
        availableDateTypes={["day", "week", "month", "custom"]}
        filters={[]}
        filtersExpanded={false}
        onFiltersToggle={() => {}}
        sortOptions={[
          { value: "createdAt", label: "Date Created" },
          { value: "type", label: "Report Type" },
        ]}
        sortValue="createdAt"
        sortDirection="desc"
        onSortChange={() => {}}
        onExportCSV={() => {}}
        additionalButtons={[
          {
            label: "Export PDF",
            icon: <Download />,
            onClick: () => alert("Export functionality coming soon"),
            variant: "outlined" as const,
            color: "secondary" as const,
          },
          {
            label: "Print",
            icon: <Print />,
            onClick: () => window.print(),
            variant: "outlined" as const,
            color: "secondary" as const,
          },
        ]}
      />

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%", boxShadow: 3, borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Net Profit
              </Typography>
              <Typography 
                variant="h4" 
                fontWeight="bold" 
                color={netProfit >= 0 ? "success.main" : "error.main"}
              >
                <AnimatedCounter
                  value={netProfit}
                  prefix="£"
                  suffix=""
                  decimals={0}
                  duration={1000}
                />
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                {netProfit >= 0 ? (
                  <TrendingUp sx={{ color: "success.main", mr: 0.5, fontSize: 16 }} />
                ) : (
                  <TrendingDown sx={{ color: "error.main", mr: 0.5, fontSize: 16 }} />
                )}
                <Typography variant="body2" color="text.secondary">
                  Current period
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%", boxShadow: 3, borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Total Revenue
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                <AnimatedCounter
                  value={totalRevenue}
                  prefix="£"
                  suffix=""
                  decimals={0}
                  duration={1000}
                />
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
                Income generated
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%", boxShadow: 3, borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Total Expenses
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="error.main">
                <AnimatedCounter
                  value={totalExpenses}
                  prefix="£"
                  suffix=""
                  decimals={0}
                  duration={1000}
                />
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
                Operating costs
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%", boxShadow: 3, borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Gross Margin
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="info.main">
                {totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0}%
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
                Profit margin
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{
            "& .MuiTab-root": { fontWeight: "medium" },
            "& .Mui-selected": { color: themeConfig.brandColors.navy },
            "& .MuiTabs-indicator": { backgroundColor: themeConfig.brandColors.navy },
          }}
        >
          <Tab label="Profit & Loss" />
          <Tab label="Balance Sheet" />
          <Tab label="Cash Flow" />
          <Tab label="Saved Reports" />
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom fontWeight="medium">
                  Profit & Loss Statement
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Revenue minus expenses for the selected period
                </Typography>
              </Box>
              <Button 
                variant="contained" 
                startIcon={<Assessment />}
                onClick={() => handleGenerateReport("profit_loss")}
              >
                Generate Report
              </Button>
            </Box>

            <Divider sx={{ my: 3 }} />

            <TableContainer component={Paper} sx={{ backgroundColor: "transparent", boxShadow: 0 }}>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold", fontSize: "1.1rem" }}>Revenue</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                  {accounts.filter(acc => acc.type === "revenue").map(acc => (
                    <TableRow key={acc.id}>
                      <TableCell sx={{ pl: 4 }}>{acc.name}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500 }}>
                        ${acc.balance.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Total Revenue</TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                      ${totalRevenue.toLocaleString()}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell colSpan={2} sx={{ py: 2 }}></TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold", fontSize: "1.1rem" }}>Expenses</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                  {accounts.filter(acc => acc.type === "expense").map(acc => (
                    <TableRow key={acc.id}>
                      <TableCell sx={{ pl: 4 }}>{acc.name}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500, color: "error.main" }}>
                        ${Math.abs(acc.balance).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Total Expenses</TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold", fontSize: "1.1rem", color: "error.main" }}>
                      ${totalExpenses.toLocaleString()}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell colSpan={2}>
                      <Divider sx={{ my: 1 }} />
                    </TableCell>
                  </TableRow>

                  <TableRow sx={{ backgroundColor: netProfit >= 0 ? "success.light" : "error.light" }}>
                    <TableCell sx={{ fontWeight: "bold", fontSize: "1.2rem" }}>Net Profit/Loss</TableCell>
                    <TableCell 
                      align="right" 
                      sx={{ 
                        fontWeight: "bold", 
                        fontSize: "1.2rem",
                        color: netProfit >= 0 ? "success.dark" : "error.dark"
                      }}
                    >
                      ${netProfit.toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom fontWeight="medium">
                  Balance Sheet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Assets, Liabilities, and Equity overview
                </Typography>
              </Box>
              <Button 
                variant="contained" 
                startIcon={<Assessment />}
                onClick={() => handleGenerateReport("balance_sheet")}
              >
                Generate Report
              </Button>
            </Box>

            <Divider sx={{ my: 3 }} />

            <TableContainer component={Paper} sx={{ backgroundColor: "transparent", boxShadow: 0 }}>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold", fontSize: "1.1rem" }}>Assets</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                  {accounts.filter(acc => acc.type === "asset").map(acc => (
                    <TableRow key={acc.id}>
                      <TableCell sx={{ pl: 4 }}>{acc.name}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500 }}>
                        ${acc.balance.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Total Assets</TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold", fontSize: "1.1rem", color: "success.main" }}>
                      ${totalAssets.toLocaleString()}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell colSpan={2} sx={{ py: 2 }}></TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold", fontSize: "1.1rem" }}>Liabilities</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                  {accounts.filter(acc => acc.type === "liability").map(acc => (
                    <TableRow key={acc.id}>
                      <TableCell sx={{ pl: 4 }}>{acc.name}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500, color: "error.main" }}>
                        ${Math.abs(acc.balance).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Total Liabilities</TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold", fontSize: "1.1rem", color: "error.main" }}>
                      ${totalLiabilities.toLocaleString()}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell colSpan={2} sx={{ py: 2 }}></TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold", fontSize: "1.1rem" }}>Equity</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                  {accounts.filter(acc => acc.type === "equity").map(acc => (
                    <TableRow key={acc.id}>
                      <TableCell sx={{ pl: 4 }}>{acc.name}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500 }}>
                        ${acc.balance.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell sx={{ pl: 4 }}>Retained Earnings</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 500 }}>
                      ${grossProfit.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Total Equity</TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold", fontSize: "1.1rem", color: "info.main" }}>
                      ${totalEquity.toLocaleString()}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell colSpan={2}>
                      <Divider sx={{ my: 1 }} />
                    </TableCell>
                  </TableRow>

                  <TableRow sx={{ backgroundColor: "action.hover" }}>
                    <TableCell sx={{ fontWeight: "bold", fontSize: "1.2rem" }}>Total Liabilities & Equity</TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold", fontSize: "1.2rem" }}>
                      ${(totalLiabilities + totalEquity).toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom fontWeight="medium">
                  Cash Flow Statement
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Cash inflows and outflows for the period
                </Typography>
              </Box>
              <Button 
                variant="contained" 
                startIcon={<Assessment />}
                onClick={() => handleGenerateReport("cash_flow")}
              >
                Generate Report
              </Button>
            </Box>

            <Divider sx={{ my: 3 }} />

            <TableContainer component={Paper} sx={{ backgroundColor: "transparent", boxShadow: 0 }}>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold", fontSize: "1.1rem" }}>Operating Activities</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ pl: 4 }}>Net Income</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 500 }}>
                      ${netProfit.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ pl: 4 }}>Changes in Working Capital</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 500 }}>
                      $0
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Net Cash from Operating Activities</TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                      ${cashFlowOperating.toLocaleString()}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell colSpan={2} sx={{ py: 2 }}></TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold", fontSize: "1.1rem" }}>Investing Activities</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ pl: 4 }}>Capital Expenditures</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 500 }}>
                      ${cashFlowInvesting.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Net Cash from Investing Activities</TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                      ${cashFlowInvesting.toLocaleString()}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell colSpan={2} sx={{ py: 2 }}></TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold", fontSize: "1.1rem" }}>Financing Activities</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ pl: 4 }}>Loans & Borrowings</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 500 }}>
                      ${cashFlowFinancing.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Net Cash from Financing Activities</TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                      ${cashFlowFinancing.toLocaleString()}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell colSpan={2}>
                      <Divider sx={{ my: 1 }} />
                    </TableCell>
                  </TableRow>

                  <TableRow sx={{ backgroundColor: "action.hover" }}>
                    <TableCell sx={{ fontWeight: "bold", fontSize: "1.2rem" }}>Net Change in Cash</TableCell>
                    <TableCell 
                      align="right" 
                      sx={{ 
                        fontWeight: "bold", 
                        fontSize: "1.2rem",
                        color: netCashFlow >= 0 ? "success.main" : "error.main"
                      }}
                    >
                      ${netCashFlow.toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom fontWeight="medium">
                  Saved Reports
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Access previously generated financial reports
                </Typography>
              </Box>
            </Box>

            {reports.length > 0 ? (
              <TableContainer component={Paper} sx={{ backgroundColor: "transparent", boxShadow: 1 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Report Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Period</TableCell>
                      <TableCell>Generated</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id} hover>
                        <TableCell sx={{ fontWeight: 500 }}>{report.name}</TableCell>
                        <TableCell>{report.type}</TableCell>
                        <TableCell>
                          {report.period?.startDate ? new Date(report.period.startDate).toLocaleDateString() : "N/A"} - {report.period?.endDate ? new Date(report.period.endDate).toLocaleDateString() : "N/A"}
                        </TableCell>
                        <TableCell>{new Date(report.generatedAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <IconButton onClick={(e) => handleMenuClick(e, report)} color="primary">
                            <MoreVert />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ textAlign: "center", py: 8 }}>
                <Assessment sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
                <Typography variant="h6" fontWeight="medium" gutterBottom>
                  No Saved Reports
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Generate reports from other tabs to save them for future reference
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      {/* Report Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        sx={{ mt: 1 }}
      >
        <MenuItem onClick={handleMenuClose}>
          <Visibility sx={{ mr: 1 }} fontSize="small" />
          View Report
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <Download sx={{ mr: 1 }} fontSize="small" />
          Download
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <Share sx={{ mr: 1 }} fontSize="small" />
          Share
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={() => selectedReport && handleDeleteReport(selectedReport)} 
          sx={{ color: "error.main" }}
        >
          <Delete sx={{ mr: 1 }} fontSize="small" />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  )
}

export default Reporting

