"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  CircularProgress,
  Alert,
} from "@mui/material"
import { useBookings as useBookingsContext, Booking, BookingType, Table, BookingStatus } from "../../../backend/context/BookingsContext"
// All operations now come from BookingsContext
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { format, parseISO } from "date-fns"

interface BookingFormProps {
  open: boolean
  onClose: () => void
  booking?: Booking
  tables?: Table[]
  bookingTypes?: BookingType[]
  bookingStatuses?: BookingStatus[]
  onBookingUpdate?: () => void
  onSave?: () => void
}

const BookingForm: React.FC<BookingFormProps> = ({ 
  open = false, 
  onClose, 
  booking, 
  bookingTypes, 
  bookingStatuses, 
  onBookingUpdate, 
  onSave 
}) => {
  const { 
    bookingTypes: contextBookingTypes,
    bookingStatuses: contextBookingStatuses,
    addBooking,
    updateBooking,
    fetchBookingTypes,
    fetchBookingStatuses,
    fetchTables  } = useBookingsContext()

  const [formData, setFormData] = useState<Partial<Booking>>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    source: "",
    notes: "",
    date: format(new Date(), "yyyy-MM-dd"),
    bookingType: "",
    guests: 1,
    arrivalTime: "18:00",
    duration: 2,
    status: "Pending",
    tracking: "Not Arrived",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    specialRequests: "",
    dietaryRequirements: "",
    deposit: 0,
    depositPaid: false,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Determine effective data sources (props or context)
  const effectiveBookingTypes = bookingTypes || contextBookingTypes || []
  const effectiveBookingStatuses = bookingStatuses || contextBookingStatuses || []

  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open])

  useEffect(() => {
    if (booking) {
      setFormData({
        ...booking,
        tracking: booking.tracking || "Not Arrived",
      })
    } else {
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        company: "",
        source: "",
        notes: "",
        date: format(new Date(), "yyyy-MM-dd"),
        bookingType: "",
        guests: 1,
        arrivalTime: "18:00",
        duration: 2,
        status: "Pending",
        tracking: "Not Arrived",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        specialRequests: "",
        dietaryRequirements: "",
        deposit: 0,
        depositPaid: false,
      })
    }
  }, [booking, open])

  const fetchData = async () => {
    try {
      setLoadingData(true)
      setError(null)

      await Promise.all([
        fetchBookingTypes(),
        fetchBookingStatuses(),
        fetchTables(),
      ])
      
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Failed to load booking data')
    } finally {
      setLoadingData(false)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.firstName?.trim()) newErrors.firstName = "First name is required"
    if (!formData.lastName?.trim()) newErrors.lastName = "Last name is required"
    if (!formData.email?.trim()) newErrors.email = "Email is required"
    if (!formData.phone?.trim()) newErrors.phone = "Phone is required"
    if (!formData.date) newErrors.date = "Date is required"
    if (!formData.arrivalTime) newErrors.arrivalTime = "Arrival time is required"
    if (!formData.guests || formData.guests < 1) newErrors.guests = "Number of guests must be at least 1"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      const updatedFormData = {
        ...formData,
        updatedAt: new Date().toISOString(),
      }

      if (booking?.id) {
        await updateBooking(booking.id, updatedFormData as Booking)
        if (onBookingUpdate) onBookingUpdate()
      } else {
        await addBooking(updatedFormData as Omit<Booking, "id" | "createdAt" | "updatedAt">)
      }

      onClose()
      if (onSave) onSave()
    } catch (error) {
      console.error('Error saving booking:', error)
      setError('Failed to save booking')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof Booking) => (event: any) => {
    const value = event.target ? event.target.value : event
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ""
      }))
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {booking ? "Edit Booking" : "Create New Booking"}
      </DialogTitle>
      
      <DialogContent>
        {loadingData ? (
          <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={formData.firstName || ""}
                  onChange={handleChange("firstName")}
                  error={!!errors.firstName}
                  helperText={errors.firstName}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={formData.lastName || ""}
                  onChange={handleChange("lastName")}
                  error={!!errors.lastName}
                  helperText={errors.lastName}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email || ""}
                  onChange={handleChange("email")}
                  error={!!errors.email}
                  helperText={errors.email}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={formData.phone || ""}
                  onChange={handleChange("phone")}
                  error={!!errors.phone}
                  helperText={errors.phone}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Date"
                    value={formData.date ? parseISO(formData.date) : null}
                    onChange={(date) => {
                      if (date) {
                        handleChange("date")(format(date, "yyyy-MM-dd"))
                      }
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!errors.date,
                        helperText: errors.date
                      }
                    }}
                  />
                </LocalizationProvider>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Arrival Time"
                  type="time"
                  value={formData.arrivalTime || ""}
                  onChange={handleChange("arrivalTime")}
                  error={!!errors.arrivalTime}
                  helperText={errors.arrivalTime}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Number of Guests"
                  type="number"
                  value={formData.guests || ""}
                  onChange={handleChange("guests")}
                  error={!!errors.guests}
                  helperText={errors.guests}
                  inputProps={{ min: 1 }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Duration (hours)"
                  type="number"
                  value={formData.duration || ""}
                  onChange={handleChange("duration")}
                  inputProps={{ min: 0.5, step: 0.5 }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Booking Type</InputLabel>
                  <Select
                    value={formData.bookingType || ""}
                    onChange={handleChange("bookingType")}
                    label="Booking Type"
                  >
                    {effectiveBookingTypes.map((type) => (
                      <MenuItem key={type.id || type.name} value={type.name}>
                        {type.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status || ""}
                    onChange={handleChange("status")}
                    label="Status"
                  >
                    {effectiveBookingStatuses.map((status) => (
                      <MenuItem key={status.id || status.name} value={status.name}>
                        {status.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={3}
                  value={formData.notes || ""}
                  onChange={handleChange("notes")}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Special Requests"
                  multiline
                  rows={2}
                  value={formData.specialRequests || ""}
                  onChange={handleChange("specialRequests")}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Dietary Requirements"
                  multiline
                  rows={2}
                  value={formData.dietaryRequirements || ""}
                  onChange={handleChange("dietaryRequirements")}
                />
              </Grid>
            </Grid>
          </>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading || loadingData}
        >
          {loading ? <CircularProgress size={20} /> : (booking ? "Update" : "Create")}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default BookingForm
