"use client"

import { themeConfig } from "../../../../theme/AppTheme";
import { alpha } from "@mui/material/styles";
import React, { useState, useMemo } from 'react'
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material'
import {
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Replay as RetryIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
} from '@mui/icons-material'
import EmptyStateCard from "../../reusable/EmptyStateCard"
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { useHRReportContext } from '../../../../backend/context/AnalyticsContext'
import { useSettings } from '../../../../backend/context/SettingsContext'
import { submitFPSForPayrollRun } from '../../../../backend/functions/HMRCRTISubmission'
import type { Payroll } from '../../../../backend/interfaces/HRs'
import DataHeader from "../../reusable/DataHeader"
import type { HRReportProps } from "./reportTypes"

const HMRCSubmissionHistoryReport: React.FC<HRReportProps> = ({ headerControls }) => {
  const { hr, hrState, companyState } = useHRReportContext()
  const { state: settingsState } = useSettings()
  const { refreshPayrolls } = hr
  const currentUserId = settingsState?.auth?.uid || settingsState?.user?.uid || "system"
  
  const [startDate, setStartDate] = useState<Date>(startOfMonth(subMonths(new Date(), 3)))
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()))
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [retrying, setRetrying] = useState<string | null>(null)
  const [notification, setNotification] = useState<{
    message: string
    type: "success" | "error" | "info"
  } | null>(null)
  
  // Filter payroll records with HMRC submission data
  const submissionHistory = useMemo(() => {
    return (hrState.payrollRecords || []).filter((payroll: Payroll) => {
      // Filter by date range
      if (payroll.fpsSubmissionDate) {
        const submissionDate = new Date(payroll.fpsSubmissionDate)
        if (submissionDate < startDate || submissionDate > endDate) {
          return false
        }
      } else if (payroll.approvedAt) {
        const approvedDate = new Date(payroll.approvedAt)
        if (approvedDate < startDate || approvedDate > endDate) {
          return false
        }
      } else {
        return false
      }
      
      // Filter by status
      if (statusFilter !== 'all') {
        if (statusFilter === 'submitted' && !payroll.submittedToHMRC) return false
        if (statusFilter === 'failed' && payroll.submittedToHMRC) return false
        if (statusFilter === 'pending' && payroll.submittedToHMRC) return false
      }
      
      return true
    }).sort((a: Payroll, b: Payroll) => {
      const dateA = a.fpsSubmissionDate || a.approvedAt || 0
      const dateB = b.fpsSubmissionDate || b.approvedAt || 0
      return dateB - dateA
    })
  }, [hrState.payrollRecords, startDate, endDate, statusFilter])
  
  // Calculate statistics
  const stats = useMemo(() => {
    const total = submissionHistory.length
    const submitted = submissionHistory.filter((p: Payroll) => p.submittedToHMRC).length
    const failed = submissionHistory.filter((p: Payroll) => !p.submittedToHMRC && p.status === 'approved').length
    const pending = submissionHistory.filter((p: Payroll) => !p.submittedToHMRC && p.status === 'approved').length
    
    return { total, submitted, failed, pending }
  }, [submissionHistory])
  
  // Get submission status
  const getSubmissionStatus = (payroll: Payroll) => {
    if (payroll.submittedToHMRC) {
      return { label: 'Submitted', color: 'success' as const }
    }
    if (payroll.status === 'approved') {
      return { label: 'Ready to Submit', color: 'warning' as const }
    }
    return { label: 'Not Approved', color: 'default' as const }
  }
  
  // Retry submission
  const handleRetrySubmission = async (payroll: Payroll) => {
    if (!companyState.selectedCompany?.id || !companyState.selectedSite?.id) {
      setNotification({ message: "Please select a company and site", type: "error" })
      return
    }
    
    try {
      setRetrying(payroll.id)
      
      const result = await submitFPSForPayrollRun(
        companyState.selectedCompany.id,
        companyState.selectedSite.id,
        [payroll.id],
        currentUserId
      )
      
      if (result.success) {
        setNotification({ message: "Successfully resubmitted to HMRC", type: "success" })
        await refreshPayrolls()
      } else {
        setNotification({ 
          message: `Resubmission failed: ${result.errors?.map(e => e.message).join(', ')}`, 
          type: "error" 
        })
      }
    } catch (error: any) {
      console.error('Error retrying submission:', error)
      setNotification({ message: error.message || "Error retrying submission", type: "error" })
    } finally {
      setRetrying(null)
    }
  }
  
  // View submission details
  const handleViewDetails = (payroll: Payroll) => {
    setSelectedPayroll(payroll)
    setShowDetailsDialog(true)
  }
  
  // Export to Excel
  const handleExportExcel = () => {
    const headers = [
      "Employee Name",
      "Pay Period Start",
      "Pay Period End",
      "Gross Pay",
      "Net Pay",
      "Tax Deductions",
      "NI Deductions",
      "Submission Date",
      "Submission ID",
      "Status",
      "HMRC Response",
    ]
    
    const rows = submissionHistory.map((p: Payroll) => [
      p.employeeName,
      p.payPeriodStart,
      p.payPeriodEnd,
      p.grossPay,
      p.netPay,
      p.taxDeductions || 0,
      p.employeeNIDeductions || 0,
      p.fpsSubmissionDate ? new Date(p.fpsSubmissionDate).toLocaleDateString() : 'N/A',
      p.fpsSubmissionId || 'N/A',
      getSubmissionStatus(p).label,
      p.hmrcResponse ? 'Yes' : 'No',
    ])
    
    // Create workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    
    // Set column widths
    ws['!cols'] = [
      { wch: 20 }, // Employee Name
      { wch: 15 }, // Pay Period Start
      { wch: 15 }, // Pay Period End
      { wch: 12 }, // Gross Pay
      { wch: 12 }, // Net Pay
      { wch: 12 }, // Tax Deductions
      { wch: 12 }, // NI Deductions
      { wch: 18 }, // Submission Date
      { wch: 25 }, // Submission ID
      { wch: 15 }, // Status
      { wch: 15 }, // HMRC Response
    ]
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'HMRC Submissions')
    
    // Write file
    XLSX.writeFile(wb, `hmrc_submission_history_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
    setNotification({ message: "Excel file exported successfully", type: "success" })
  }
  
  // Export to PDF
  const handleExportPDF = () => {
    const doc = new jsPDF('landscape')
    
    // Add title
    doc.setFontSize(16)
    doc.text('HMRC Submission History Report', 14, 15)
    doc.setFontSize(10)
    doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, 22)
    doc.text(`Period: ${format(startDate, 'dd MMM yyyy')} - ${format(endDate, 'dd MMM yyyy')}`, 14, 28)
    
    // Prepare table data
    const tableData = submissionHistory.map((p: Payroll) => [
      p.employeeName,
      format(new Date(p.payPeriodStart), 'dd/MM/yyyy'),
      format(new Date(p.payPeriodEnd), 'dd/MM/yyyy'),
      `£${p.grossPay.toFixed(2)}`,
      `£${p.netPay.toFixed(2)}`,
      p.fpsSubmissionDate ? format(new Date(p.fpsSubmissionDate), 'dd/MM/yyyy') : 'N/A',
      p.fpsSubmissionId || 'N/A',
      getSubmissionStatus(p).label,
    ])
    
    // Add table
    ;(doc as any).autoTable({
      head: [['Employee', 'Period Start', 'Period End', 'Gross Pay', 'Net Pay', 'Submitted', 'Submission ID', 'Status']],
      body: tableData,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [25, 118, 210], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 },
        6: { cellWidth: 40 },
        7: { cellWidth: 25 },
      },
      margin: { top: 35 },
    })
    
    // Add summary statistics
    const finalY = (doc as any).lastAutoTable.finalY || 35
    doc.setFontSize(10)
    doc.text(`Total Records: ${stats.total}`, 14, finalY + 10)
    doc.text(`Submitted: ${stats.submitted}`, 14, finalY + 16)
    doc.text(`Pending: ${stats.pending}`, 14, finalY + 22)
    doc.text(`Failed: ${stats.failed}`, 14, finalY + 28)
    
    // Save PDF
    doc.save(`hmrc_submission_history_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
    setNotification({ message: "PDF file exported successfully", type: "success" })
  }
  
  return (
    <Box>
      <DataHeader
        showDateControls={true}
        showDateTypeSelector={false}
        dateType="custom"
        currentDate={startDate}
        onDateChange={setStartDate}
        customStartDate={startDate}
        customEndDate={endDate}
        onCustomDateRangeChange={(start, end) => {
          setStartDate(start)
          setEndDate(end)
        }}
        additionalControls={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            {headerControls}
            <FormControl size="small" sx={{ minWidth: 160, ml: 1 }}>
              <InputLabel sx={{ color: "white" }}>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status"
                sx={{
                  color: "white",
                  "& .MuiSvgIcon-root": { color: "white" },
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: "white" },
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: alpha(themeConfig.brandColors.offWhite, 0.85) },
                }}
                MenuProps={{ PaperProps: { sx: { mt: 1 } } }}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="submitted">Submitted</MenuItem>
                <MenuItem value="pending">Ready to Submit</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
              </Select>
            </FormControl>
          </Box>
        }
        onRefresh={refreshPayrolls}
        additionalButtons={[
          {
            label: "Export Excel",
            icon: <ExcelIcon />,
            onClick: handleExportExcel,
            variant: "outlined",
            color: "success",
          },
          {
            label: "Export PDF",
            icon: <PdfIcon />,
            onClick: handleExportPDF,
            variant: "outlined",
            color: "error",
          },
        ]}
      />
        
        {/* Statistics Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="primary">
                  {stats.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Records
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="success.main">
                  {stats.submitted}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Submitted
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="warning.main">
                  {stats.pending}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Ready to Submit
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="error.main">
                  {stats.failed}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Failed
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {/* Submission History Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Pay Period</TableCell>
                <TableCell align="right">Gross Pay</TableCell>
                <TableCell align="right">Net Pay</TableCell>
                <TableCell>Submission Date</TableCell>
                <TableCell>Submission ID</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {submissionHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <EmptyStateCard
                      icon={RefreshIcon}
                      title="No submission history found"
                      description="No submission history found for the selected period."
                      cardSx={{ maxWidth: 560, mx: "auto", boxShadow: "none" }}
                      contentSx={{ py: 2 }}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                submissionHistory.map((payroll: Payroll) => {
                  const status = getSubmissionStatus(payroll)
                  return (
                    <TableRow key={payroll.id} hover>
                      <TableCell>{payroll.employeeName}</TableCell>
                      <TableCell>
                        {format(new Date(payroll.payPeriodStart), 'MMM dd')} -{' '}
                        {format(new Date(payroll.payPeriodEnd), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell align="right">£{payroll.grossPay.toFixed(2)}</TableCell>
                      <TableCell align="right">£{payroll.netPay.toFixed(2)}</TableCell>
                      <TableCell>
                        {payroll.fpsSubmissionDate
                          ? format(new Date(payroll.fpsSubmissionDate), 'MMM dd, yyyy HH:mm')
                          : 'Not submitted'}
                      </TableCell>
                      <TableCell>
                        {payroll.fpsSubmissionId || (
                          <Typography variant="body2" color="text.secondary">
                            N/A
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip label={status.label} color={status.color} size="small" />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleViewDetails(payroll)}
                            title="View Details"
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                          {!payroll.submittedToHMRC && payroll.status === 'approved' && (
                            <IconButton
                              size="small"
                              onClick={() => handleRetrySubmission(payroll)}
                              disabled={retrying === payroll.id}
                              title="Retry Submission"
                              color="primary"
                            >
                              <RetryIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Details Dialog */}
        <Dialog open={showDetailsDialog} onClose={() => setShowDetailsDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Submission Details</DialogTitle>
          <DialogContent>
            {selectedPayroll && (
              <Box>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Employee</Typography>
                    <Typography variant="body1">{selectedPayroll.employeeName}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Pay Period</Typography>
                    <Typography variant="body1">
                      {format(new Date(selectedPayroll.payPeriodStart), 'MMM dd, yyyy')} -{' '}
                      {format(new Date(selectedPayroll.payPeriodEnd), 'MMM dd, yyyy')}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Gross Pay</Typography>
                    <Typography variant="body1">£{selectedPayroll.grossPay.toFixed(2)}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Net Pay</Typography>
                    <Typography variant="body1">£{selectedPayroll.netPay.toFixed(2)}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Submission Status</Typography>
                    <Chip
                      label={getSubmissionStatus(selectedPayroll).label}
                      color={getSubmissionStatus(selectedPayroll).color}
                      size="small"
                    />
                  </Grid>
                  {selectedPayroll.fpsSubmissionDate && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">Submission Date</Typography>
                      <Typography variant="body1">
                        {format(new Date(selectedPayroll.fpsSubmissionDate), 'MMM dd, yyyy HH:mm:ss')}
                      </Typography>
                    </Grid>
                  )}
                  {selectedPayroll.fpsSubmissionId && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">Submission ID</Typography>
                      <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                        {selectedPayroll.fpsSubmissionId}
                      </Typography>
                    </Grid>
                  )}
                  {selectedPayroll.hmrcResponse && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">HMRC Response</Typography>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 200, overflow: 'auto' }}>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                          {selectedPayroll.hmrcResponse}
                        </Typography>
                      </Paper>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            {selectedPayroll && !selectedPayroll.submittedToHMRC && selectedPayroll.status === 'approved' && (
              <Button
                variant="contained"
                startIcon={<RetryIcon />}
                onClick={() => {
                  handleRetrySubmission(selectedPayroll)
                  setShowDetailsDialog(false)
                }}
              >
                Retry Submission
              </Button>
            )}
          </DialogActions>
        </Dialog>
        
        {notification && (
          <Alert
            severity={notification.type}
            onClose={() => setNotification(null)}
            sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9999 }}
          >
            {notification.message}
          </Alert>
        )}
    </Box>
  )
}

export default HMRCSubmissionHistoryReport

