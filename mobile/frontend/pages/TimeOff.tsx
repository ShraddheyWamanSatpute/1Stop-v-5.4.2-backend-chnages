/**
 * ESS Time Off Page
 * 
 * Time off request management:
 * - View pending/approved requests
 * - Submit new requests
 * - Cancel pending requests
 */

"use client"

import React, { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { differenceInDays } from "date-fns"
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Tabs,
  Tab,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Divider,
  IconButton,
  useTheme,
} from "@mui/material"
import { alpha } from "@mui/material/styles"
import {
  EventNote as EventIcon,
  Close as CloseIcon,
  CheckCircle as ApprovedIcon,
  HourglassEmpty as PendingIcon,
  Cancel as RejectedIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material"
import { useESS } from "../../backend/context/MobileContext"
import { EmptyState } from "../components"
import type { ESSTimeOffRequest } from "../../backend/interfaces"

const ESSTimeOff: React.FC = () => {
  const theme = useTheme()
  const { state, requestTimeOff, cancelTimeOffRequest, clearError, refreshData } = useESS()
  const [searchParams] = useSearchParams()

  const [tabValue, setTabValue] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    type: "vacation",
    startDate: "",
    endDate: "",
    notes: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Auto-open dialog if 'request' query parameter is present
  useEffect(() => {
    if (searchParams.get("request") === "true") {
      setDialogOpen(true)
    }
  }, [searchParams])

  useEffect(() => {
    refreshData?.().catch?.(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.employeeId, state.emulatedEmployeeId])

  // Combine all time off requests
  const allRequests = [...state.pendingTimeOff, ...state.approvedTimeOff]
  const pendingRequests = state.pendingTimeOff
  const approvedRequests = state.approvedTimeOff

  // Get filtered requests based on tab
  const getFilteredRequests = () => {
    switch (tabValue) {
      case 1:
        return pendingRequests
      case 2:
        return approvedRequests
      default:
        return allRequests
    }
  }

  const filteredRequests = getFilteredRequests()

  // Calculate total days between dates - matching main app logic
  // Main app uses: differenceInDays(endDate, startDate) + 1, with Math.max(1, days)
  const calculateDays = (start: string, end: string): number => {
    if (!start || !end) return 1
    const startDate = new Date(start)
    const endDate = new Date(end)
    // Use date-fns differenceInDays to match main app exactly
    const days = differenceInDays(endDate, startDate) + 1
    return Math.max(1, days)
  }

  // Handle form submit
  const handleSubmit = async () => {
    if (!formData.startDate || !formData.endDate) return

    setIsSubmitting(true)
    try {
      const request: ESSTimeOffRequest = {
        type: formData.type as any,
        startDate: formData.startDate,
        endDate: formData.endDate,
        totalDays: calculateDays(formData.startDate, formData.endDate),
        notes: formData.notes,
      }

      const success = await requestTimeOff(request)
      if (success) {
        setDialogOpen(false)
        setFormData({ type: "vacation", startDate: "", endDate: "", notes: "" })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle cancel request
  const handleCancel = async (requestId: string) => {
    await cancelTimeOffRequest(requestId)
  }

  // Get status chip props
  const getStatusChip = (status: string) => {
    switch (status) {
      case "approved":
        return { icon: <ApprovedIcon />, color: "success" as const, label: "Approved" }
      case "pending":
        return { icon: <PendingIcon />, color: "warning" as const, label: "Pending" }
      case "rejected":
      case "denied":
        return { icon: <RejectedIcon />, color: "error" as const, label: "Rejected" }
      default:
        return { icon: <EventIcon />, color: "default" as const, label: status }
    }
  }

  // Format date
  const formatDate = (date: string | number): string => {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  return (
    <Box sx={{ 
      p: { xs: 1.5, sm: 2 },
      pb: { xs: 12, sm: 4 },
      maxWidth: "100%",
      overflowX: "hidden",
    }}>
      {/* Request Button - Positioned just below header */}
      <Box sx={{ 
        display: "flex", 
        justifyContent: "flex-end", 
        mb: { xs: 2, sm: 2.5 },
        mt: { xs: 0.5, sm: 1 },
      }}>
        <Button
          variant="contained"
          size="small"
          startIcon={<EventIcon />}
          onClick={() => setDialogOpen(true)}
          sx={{ 
            borderRadius: 2,
            minWidth: "auto",
            px: 1.5,
            fontSize: { xs: "0.75rem", sm: "0.875rem" },
            minHeight: { xs: 36, sm: 40 },
          }}
        >
          Request
        </Button>
      </Box>

      {/* Holiday Balance Summary */}
      <Card sx={{ 
        mb: { xs: 2, sm: 3 }, 
        borderRadius: { xs: 2, sm: 3 }, 
        bgcolor: alpha(theme.palette.primary.main, 0.08) 
      }}>
        <CardContent sx={{ 
          display: "flex", 
          justifyContent: "space-around", 
          textAlign: "center",
          p: { xs: 1.5, sm: 2 },
        }}>
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: "text.secondary",
                fontSize: { xs: "1.5rem", sm: "2rem" },
              }}
            >
              {state.holidayBalance.total}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: { xs: "0.65rem", sm: "0.75rem" } }}
            >
              Accrued
            </Typography>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700, 
                color: "primary.main",
                fontSize: { xs: "1.5rem", sm: "2rem" },
              }}
            >
              {state.holidayBalance.remaining}
            </Typography>
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ fontSize: { xs: "0.65rem", sm: "0.75rem" } }}
            >
              Remaining
            </Typography>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700,
                fontSize: { xs: "1.5rem", sm: "2rem" },
              }}
            >
              {state.holidayBalance.used}
            </Typography>
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ fontSize: { xs: "0.65rem", sm: "0.75rem" } }}
            >
              Taken
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs
        value={tabValue}
        onChange={(_, newValue) => setTabValue(newValue)}
        sx={{ 
          mb: { xs: 1.5, sm: 2 },
          bgcolor: "primary.main",
          borderRadius: 2,
          "& .MuiTab-root": {
            fontSize: { xs: "0.75rem", sm: "0.875rem" },
            minHeight: { xs: 48, sm: 48 },
            color: "primary.contrastText",
            opacity: 0.75,
            "&.Mui-selected": {
              color: "primary.contrastText",
              opacity: 1,
            },
          },
          "& .MuiTabs-indicator": {
            backgroundColor: "primary.contrastText",
          },
        }}
        variant="fullWidth"
      >
        <Tab label={`All (${allRequests.length})`} />
        <Tab label={`Pending (${pendingRequests.length})`} />
        <Tab label={`Approved (${approvedRequests.length})`} />
      </Tabs>

      {/* Error Alert */}
      {state.error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: { xs: 1.5, sm: 2 }, 
            borderRadius: 2,
            fontSize: { xs: "0.8125rem", sm: "0.875rem" },
          }} 
          onClose={clearError}
        >
          {state.error.message}
        </Alert>
      )}

      {/* Requests List */}
      {filteredRequests.length > 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 1.5, sm: 2 } }}>
          {filteredRequests.map((request) => {
            const statusProps = getStatusChip(request.status)
            return (
              <Card key={request.id} sx={{ borderRadius: { xs: 2, sm: 3 } }}>
                <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                  <Box sx={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "flex-start", 
                    mb: { xs: 1.5, sm: 2 },
                    gap: 1,
                  }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography 
                        variant="subtitle1" 
                        sx={{ 
                          fontWeight: 600, 
                          textTransform: "capitalize",
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                        }}
                      >
                        {request.type}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                      >
                        {formatDate(request.startDate)} - {formatDate(request.endDate)}
                      </Typography>
                    </Box>
                    <Chip
                      icon={statusProps.icon}
                      label={statusProps.label}
                      color={statusProps.color}
                      size="small"
                      sx={{
                        fontSize: { xs: "0.65rem", sm: "0.75rem" },
                        height: { xs: 20, sm: 24 },
                      }}
                    />
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography 
                      variant="body2"
                      sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                    >
                      <strong>{request.totalDays}</strong> day{request.totalDays !== 1 ? "s" : ""}
                    </Typography>
                    {request.status === "pending" && (
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />}
                        onClick={() => handleCancel(request.id)}
                        sx={{
                          minHeight: { xs: 36, sm: 32 },
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </Box>
                  {request.notes && (
                    <Typography 
                      variant="caption" 
                      color="text.secondary" 
                      sx={{ 
                        mt: 1, 
                        display: "block",
                        fontSize: { xs: "0.7rem", sm: "0.75rem" },
                      }}
                    >
                      Note: {request.notes}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </Box>
      ) : (
        <EmptyState
          icon={<EventIcon sx={{ fontSize: { xs: 40, sm: 48 } }} />}
          title="No Time Off Requests"
          description="You haven't made any time off requests yet. Tap the button above to submit a new request."
        />
      )}

      {/* New Request Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ 
          sx: { 
            borderRadius: { xs: 2, sm: 3 },
            m: { xs: 1, sm: 2 },
            maxHeight: { xs: "90vh", sm: "85vh" },
            display: "flex",
            flexDirection: "column",
          } 
        }}
      >
        <DialogTitle sx={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          fontSize: { xs: "1rem", sm: "1.25rem" },
          p: { xs: 1.5, sm: 2 },
        }}>
          Request Time Off
          <IconButton 
            onClick={() => setDialogOpen(false)} 
            size="small"
            sx={{ minWidth: { xs: 44, sm: 40 }, minHeight: { xs: 44, sm: 40 } }}
          >
            <CloseIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 1.5, sm: 2 }, flex: 1, overflow: "auto" }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 1.5, sm: 2 }, mt: { xs: 0, sm: 1 } }}>
            <TextField
              select
              label="Type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              fullWidth
              sx={{
                "& .MuiInputBase-root": {
                  fontSize: { xs: "0.875rem", sm: "1rem" },
                },
              }}
            >
              <MenuItem value="vacation">Vacation</MenuItem>
              <MenuItem value="unpaid_leave">Unpaid Leave</MenuItem>
              <MenuItem value="sick">Sick Leave</MenuItem>
              <MenuItem value="personal">Personal</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </TextField>
            <TextField
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
              sx={{
                "& .MuiInputBase-root": {
                  fontSize: { xs: "0.875rem", sm: "1rem" },
                  minHeight: { xs: 48, sm: 56 },
                },
              }}
            />
            <TextField
              label="End Date"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
              sx={{
                "& .MuiInputBase-root": {
                  fontSize: { xs: "0.875rem", sm: "1rem" },
                  minHeight: { xs: 48, sm: 56 },
                },
              }}
            />
            {formData.startDate && formData.endDate && (
              <Alert 
                severity="info" 
                sx={{ 
                  borderRadius: 2,
                  fontSize: { xs: "0.8125rem", sm: "0.875rem" },
                }}
              >
                Total: {calculateDays(formData.startDate, formData.endDate)} day(s)
              </Alert>
            )}
            <TextField
              label="Notes (Optional)"
              value={formData.notes}
              sx={{
                "& .MuiInputBase-root": {
                  fontSize: { xs: "0.875rem", sm: "1rem" },
                  minHeight: { xs: 48, sm: 56 },
                },
              }}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ 
          p: { xs: 1.5, sm: 2 },
          gap: { xs: 1, sm: 1 },
        }}>
          <Button 
            onClick={() => setDialogOpen(false)}
            sx={{
              minHeight: { xs: 44, sm: 36 },
              fontSize: { xs: "0.875rem", sm: "0.875rem" },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!formData.startDate || !formData.endDate || isSubmitting}
            sx={{
              minHeight: { xs: 44, sm: 36 },
              fontSize: { xs: "0.875rem", sm: "0.875rem" },
            }}
          >
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ESSTimeOff
