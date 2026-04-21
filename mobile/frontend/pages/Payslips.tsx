/**
 * ESS Payslips Page
 * 
 * View and download payslips:
 * - List of payslips by period
 * - View payslip details
 * - Download PDF
 */

"use client"

import React, { useState } from "react"
import {
  Box,
  Card,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Divider,
  useTheme,
} from "@mui/material"
import {
  Receipt as PayslipIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
} from "@mui/icons-material"
import { useESS } from "../../backend/context/MobileContext"
import { EmptyState } from "../components"
import type { Payroll } from "../../backend/interfaces/HRs"

const ESSPayslips: React.FC = () => {
  const theme = useTheme()
  const { state } = useESS()

  const [selectedPayslip, setSelectedPayslip] = useState<Payroll | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Format period
  const formatPeriod = (payslip: Payroll): string => {
    // Use periodStartDate to format the period
    const startDate = new Date(payslip.periodStartDate)
    const endDate = new Date(payslip.periodEndDate)
    
    if (payslip.periodType === "monthly") {
      return startDate.toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      })
    }
    
    return `${startDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} - ${endDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
  }
  
  // Format pay date
  const formatPayDate = (payslip: Payroll): string => {
    // Use periodEndDate as pay date (typically paid at end of period)
    return new Date(payslip.periodEndDate).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(amount)
  }

  // Handle view payslip
  const handleViewPayslip = (payslip: Payroll) => {
    setSelectedPayslip(payslip)
    setDialogOpen(true)
  }

  // Handle download
  const handleDownload = (payslip: Payroll) => {
    // Check for PDF URL in payslip (may be stored in different fields)
    const pdfUrl = (payslip as any).pdfUrl || (payslip as any).downloadUrl || (payslip as any).fileUrl
    if (pdfUrl) {
      window.open(pdfUrl, "_blank")
    } else {
      alert("A downloadable PDF is not available for this payslip yet.")
    }
  }

  return (
    <Box sx={{ 
      p: { xs: 1.5, sm: 2 },
      pb: { xs: 12, sm: 4 },
      maxWidth: "100%",
      overflowX: "hidden",
    }}>
      {/* Payslips List */}
      {state.payslips.length > 0 ? (
        <Card sx={{ borderRadius: 3 }}>
          <List disablePadding>
            {state.payslips.map((payslip, index) => (
              <React.Fragment key={payslip.id}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleViewPayslip(payslip)}
                    sx={{ py: 2 }}
                  >
                    <ListItemIcon>
                      <Avatar sx={{ bgcolor: theme.palette.primary.light }}>
                        <PayslipIcon color="primary" />
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={formatPeriod(payslip)}
                      secondary={`Paid: ${formatPayDate(payslip)}`}
                      primaryTypographyProps={{ fontWeight: 500 }}
                    />
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {formatCurrency(payslip.netPay || 0)}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownload(payslip)
                        }}
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </ListItemButton>
                </ListItem>
                {index < state.payslips.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Card>
      ) : (
        <EmptyState
          icon={<PayslipIcon sx={{ fontSize: 48 }} />}
          title="No Payslips"
          description="Your payslips will appear here once they are available."
        />
      )}

      {/* Payslip Detail Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          Payslip Details
          <IconButton onClick={() => setDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        {selectedPayslip && (
          <>
            <DialogContent>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Pay Period
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {formatPeriod(selectedPayslip)}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Earnings */}
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Earnings
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="body2">Gross Pay</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {formatCurrency(selectedPayslip.grossPay)}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Deductions */}
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Deductions
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="body2">Tax</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {formatCurrency(selectedPayslip.taxDeductions || 0)}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="body2">National Insurance</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {formatCurrency(selectedPayslip.employeeNIDeductions || 0)}
                </Typography>
              </Box>
              {(selectedPayslip.employeePensionDeductions || 0) > 0 && (
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="body2">Pension</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {formatCurrency(selectedPayslip.employeePensionDeductions || 0)}
                  </Typography>
                </Box>
              )}
              {(selectedPayslip.deductions?.other || 0) > 0 && (
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="body2">Other</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {formatCurrency(selectedPayslip.deductions.other || 0)}
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              {/* Net Pay */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  p: 2,
                  bgcolor: theme.palette.success.light + "30",
                  borderRadius: 2,
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Net Pay
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: "success.main" }}>
                  {formatCurrency(selectedPayslip.netPay || 0)}
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setDialogOpen(false)}>Close</Button>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={() => handleDownload(selectedPayslip)}
                disabled={!((selectedPayslip as any).pdfUrl || (selectedPayslip as any).downloadUrl || (selectedPayslip as any).fileUrl)}
              >
                Download PDF
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  )
}

export default ESSPayslips
