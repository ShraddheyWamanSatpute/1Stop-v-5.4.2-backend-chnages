"use client"

import React, { useState, useEffect } from "react"
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
} from "@mui/material"
import {
  Send as SendIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material"
import { useCompany } from "../../../../backend/context/CompanyContext"
import { useHR } from "../../../../backend/context/HRContext"
import { submitFPSForPayrollRun, submitEPS } from "../../../../backend/functions/HMRCRTISubmission"
import type { Payroll } from "../../../../backend/interfaces/HRs"

const RTISubmissionTab: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { state: companyState } = useCompany()
  const { state: hrState } = useHR()
  const companyId = companyState.companyID
  const siteId = companyState.selectedSiteID
  const subsiteId = companyState.selectedSubsiteID

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [approvedPayrolls, setApprovedPayrolls] = useState<Payroll[]>([])
  const [selectedPayrolls, setSelectedPayrolls] = useState<string[]>([])
  const [epsDialogOpen, setEpsDialogOpen] = useState(false)
  const [epsData, setEpsData] = useState({
    periodNumber: 1,
    periodType: 'monthly' as 'weekly' | 'monthly' | 'fortnightly' | 'four_weekly',
    noPaymentForPeriod: false,
    employmentAllowance: {
      claimed: false,
      amount: 5000
    }
  })

  useEffect(() => {
    if (companyId && siteId) {
      loadApprovedPayrolls()
    }
  }, [companyId, siteId, hrState.payrollRecords])

  const loadApprovedPayrolls = async () => {
    if (!companyId || !siteId) return

    try {
      // Get approved payrolls that haven't been submitted
      const payrolls = (hrState.payrollRecords || []).filter(
        (p: Payroll) => p.status === 'approved' && !p.submittedToHMRC
      )
      setApprovedPayrolls(payrolls)
    } catch (err: any) {
      console.error('Error loading approved payrolls:', err)
      setError(`Failed to load payrolls: ${err.message}`)
    }
  }

  const handleSubmitFPS = async () => {
    if (selectedPayrolls.length === 0) {
      setError('Please select at least one payroll to submit')
      return
    }

    if (!companyId || !siteId) {
      setError('Company ID or Site ID missing')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const result = await submitFPSForPayrollRun(
        companyId,
        siteId,
        selectedPayrolls,
        companyState.user?.uid || '',
        subsiteId || null
      )

      if (result.success) {
        setSuccess(`FPS submitted successfully! Submission ID: ${result.submissionId}`)
        setSelectedPayrolls([])
        await loadApprovedPayrolls()
        setTimeout(() => setSuccess(null), 5000)
      } else {
        setError(`FPS submission failed: ${result.errors?.map(e => e.message).join(', ') || 'Unknown error'}`)
      }
    } catch (err: any) {
      console.error('Error submitting FPS:', err)
      setError(`Failed to submit FPS: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitEPS = async () => {
    if (!companyId || !siteId) {
      setError('Company ID or Site ID missing')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const result = await submitEPS(
        companyId,
        siteId,
        epsData,
        companyState.user?.uid || '',
        subsiteId || null
      )

      if (result.success) {
        setSuccess(`EPS submitted successfully! Submission ID: ${result.submissionId}`)
        setEpsDialogOpen(false)
        setTimeout(() => setSuccess(null), 5000)
      } else {
        setError(`EPS submission failed: ${result.errors?.map(e => e.message).join(', ') || 'Unknown error'}`)
      }
    } catch (err: any) {
      console.error('Error submitting EPS:', err)
      setError(`Failed to submit EPS: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const togglePayrollSelection = (payrollId: string) => {
    setSelectedPayrolls(prev =>
      prev.includes(payrollId)
        ? prev.filter(id => id !== payrollId)
        : [...prev, payrollId]
    )
  }

  return (
    <Box sx={{ p: embedded ? 0 : 3 }}>
      {!embedded && (
        <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
          RTI Submission
        </Typography>
      )}

      {/* FPS Submission */}
      <Card sx={{ mb: 3 }}>
        <CardHeader 
          title="Full Payment Submission (FPS)"
          action={
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={handleSubmitFPS}
              disabled={submitting || selectedPayrolls.length === 0}
            >
              Submit FPS ({selectedPayrolls.length})
            </Button>
          }
        />
        <CardContent>
          {approvedPayrolls.length === 0 ? (
            <Alert severity="info">
              No approved payroll records ready for submission. Approve payroll records first.
            </Alert>
          ) : (
            <>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <input
                          type="checkbox"
                          checked={selectedPayrolls.length === approvedPayrolls.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPayrolls(approvedPayrolls.map(p => p.id))
                            } else {
                              setSelectedPayrolls([])
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>Employee</TableCell>
                      <TableCell>Period</TableCell>
                      <TableCell>Gross Pay</TableCell>
                      <TableCell>Net Pay</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {approvedPayrolls.map((payroll) => (
                      <TableRow key={payroll.id}>
                        <TableCell padding="checkbox">
                          <input
                            type="checkbox"
                            checked={selectedPayrolls.includes(payroll.id)}
                            onChange={() => togglePayrollSelection(payroll.id)}
                          />
                        </TableCell>
                        <TableCell>{payroll.employeeName}</TableCell>
                        <TableCell>
                          {payroll.taxYear} - {payroll.periodType} {payroll.taxPeriod}
                        </TableCell>
                        <TableCell>£{payroll.grossPay.toFixed(2)}</TableCell>
                        <TableCell>£{payroll.netPay.toFixed(2)}</TableCell>
                        <TableCell>
                          <Chip
                            label={payroll.status}
                            color={payroll.status === 'approved' ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" title="View Details">
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </CardContent>
      </Card>

      {/* EPS Submission */}
      <Card>
        <CardHeader 
          title="Employer Payment Summary (EPS)"
          action={
            <Button
              variant="outlined"
              onClick={() => setEpsDialogOpen(true)}
            >
              Submit EPS
            </Button>
          }
        />
        <CardContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            EPS is used for monthly submissions when there are no payments, statutory payment recovery, 
            Employment Allowance claims, or other adjustments.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Click "Submit EPS" to submit an Employer Payment Summary.
          </Typography>
        </CardContent>
      </Card>

      {/* EPS Dialog */}
      <Dialog open={epsDialogOpen} onClose={() => setEpsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Submit Employer Payment Summary (EPS)</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Period Number"
                value={epsData.periodNumber}
                onChange={(e) => setEpsData(prev => ({ ...prev, periodNumber: parseInt(e.target.value) || 1 }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Period Type</InputLabel>
                <Select
                  value={epsData.periodType}
                  onChange={(e) => setEpsData(prev => ({ ...prev, periodType: e.target.value as any }))}
                  label="Period Type"
                >
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="fortnightly">Fortnightly</MenuItem>
                  <MenuItem value="four_weekly">Four Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={epsData.noPaymentForPeriod}
                    onChange={(e) => setEpsData(prev => ({ ...prev, noPaymentForPeriod: e.target.checked }))}
                  />
                }
                label="No Payment for This Period"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={epsData.employmentAllowance.claimed}
                    onChange={(e) => setEpsData(prev => ({
                      ...prev,
                      employmentAllowance: { ...prev.employmentAllowance, claimed: e.target.checked }
                    }))}
                  />
                }
                label="Claim Employment Allowance"
              />
            </Grid>
            {epsData.employmentAllowance.claimed && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label="Employment Allowance Amount"
                  value={epsData.employmentAllowance.amount}
                  onChange={(e) => setEpsData(prev => ({
                    ...prev,
                    employmentAllowance: { ...prev.employmentAllowance, amount: parseFloat(e.target.value) || 5000 }
                  }))}
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={handleSubmitEPS}
            disabled={submitting}
            startIcon={<SendIcon />}
          >
            Submit EPS
          </Button>
        </DialogActions>
      </Dialog>

      {/* Messages */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>
      </Snackbar>
    </Box>
  )
}

export default RTISubmissionTab

