"use client"

import React, { useState, useEffect, useMemo } from "react"
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  CircularProgress,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Checkbox,
} from "@mui/material"
import { Print, Settings } from "@mui/icons-material"
import { usePrintSettings } from "./ToolsPrintSettings"
import { useBookings } from "../../../../backend/context/BookingsContext"
import { useStock } from "../../../../backend/context/StockContext"
import { Booking } from "../../../../backend/interfaces/Bookings"
import DataHeader, { FilterOption } from "../../reusable/DataHeader"

// Helper function to format date
const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}


const RunsheetsTool: React.FC = () => {
  const { settings, updateSettings } = usePrintSettings()
  const { bookings, bookingTypes, fetchBookingsByDate, loading: bookingsLoading } = useBookings()
  const { state: stockState } = useStock()
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [showPrintView, setShowPrintView] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Filters
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedTimes, setSelectedTimes] = useState<string[]>([])
  const [showRunsheet, setShowRunsheet] = useState(true)
  const [showPreorders, setShowPreorders] = useState(true)
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [searchTerm, setSearchTerm] = useState<string>("")

  const selectedDate = formatDate(currentDate)

  const productNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of stockState.products || []) {
      if (p?.id && p?.name) map.set(String(p.id), String(p.name))
    }
    return map
  }, [stockState.products])

  const resolveProductName = (itemId: any): string => {
    const key = String(itemId || "")
    if (!key) return "Item"
    return productNameById.get(key) || "Item"
  }

  const resolveBookingTypeName = (bookingTypeId: any): string => {
    const key = String(bookingTypeId || "")
    if (!key) return "Standard"
    return bookingTypes.find((bt) => String(bt.id) === key)?.name || "Standard"
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        await fetchBookingsByDate(selectedDate)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred.")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [selectedDate, fetchBookingsByDate])

  // Filter bookings for the selected date
  const dateBookings = useMemo(() => {
    return bookings.filter((booking: Booking) => booking.date === selectedDate)
  }, [bookings, selectedDate])

  // Get available types, waiters, and times
  const availableTypes = useMemo(() => {
    const types = new Set<string>()
    dateBookings.forEach((booking: Booking) => {
      if (booking.bookingType) {
        types.add(resolveBookingTypeName(booking.bookingType))
      }
    })
    return Array.from(types).sort()
  }, [dateBookings, resolveBookingTypeName])

  const availableTimes = useMemo(() => {
    const times = new Set<string>()
    dateBookings.forEach((booking: Booking) => {
      if (booking.arrivalTime) times.add(booking.arrivalTime)
    })
    return Array.from(times).sort()
  }, [dateBookings])

  // Prepare filter options for DataHeader
  const typeFilterOptions: FilterOption[] = useMemo(() => {
    return availableTypes.map(type => ({ id: type, name: type }))
  }, [availableTypes])

  const timeFilterOptions: FilterOption[] = useMemo(() => {
    return availableTimes.map(time => ({ id: time, name: time }))
  }, [availableTimes])

  // Filter bookings
  const filteredBookings = useMemo(() => {
    return dateBookings.filter((booking: Booking) => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const customerName = `${booking.firstName || ""} ${booking.lastName || ""}`.trim().toLowerCase()
        const tableNumber = booking.tableNumber?.toString().toLowerCase() || ""
        const notes = booking.notes?.toLowerCase() || ""
        const specialRequests = booking.specialRequests?.toLowerCase() || ""
        const dietaryRequirements = booking.dietaryRequirements?.toLowerCase() || ""
        const arrivalTime = booking.arrivalTime?.toLowerCase() || ""
        
        if (
          !customerName.includes(searchLower) &&
          !tableNumber.includes(searchLower) &&
          !notes.includes(searchLower) &&
          !specialRequests.includes(searchLower) &&
          !dietaryRequirements.includes(searchLower) &&
          !arrivalTime.includes(searchLower)
        ) {
          return false
        }
      }
      
      // Type filter
      if (selectedTypes.length > 0) {
        const typeName = booking.bookingType 
          ? resolveBookingTypeName(booking.bookingType)
          : undefined
        if (!typeName || !selectedTypes.includes(typeName)) return false
      }
      
      // Time filter
      if (selectedTimes.length > 0 && (!booking.arrivalTime || !selectedTimes.includes(booking.arrivalTime))) {
        return false
      }
      
      return true
    })
  }, [dateBookings, selectedTypes, selectedTimes, resolveBookingTypeName, searchTerm])

  const handlePrint = () => {
    setShowPrintView(true)
    setTimeout(() => {
      window.print()
    }, 100)
  }

  const formatDisplayDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr + "T00:00:00")
      return date.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    } catch {
      return dateStr
    }
  }

  if (loading || bookingsLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Paper>
    )
  }

  return (
    <Box>
      <DataHeader
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        dateType="day"
        showDateTypeSelector={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search bookings, tables, notes..."
        filters={[
          {
            label: "Booking Type",
            options: typeFilterOptions,
            selectedValues: selectedTypes,
            onSelectionChange: setSelectedTypes,
          },
          {
            label: "Time",
            options: timeFilterOptions,
            selectedValues: selectedTimes,
            onSelectionChange: setSelectedTimes,
          },
        ]}
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded(!filtersExpanded)}
        additionalButtons={[
          {
            label: "Settings",
            icon: <Settings />,
            onClick: () => setSettingsOpen(true),
            variant: "outlined",
          },
          {
            label: "Print",
            icon: <Print />,
            onClick: handlePrint,
            variant: "contained",
            color: "primary",
          },
        ]}
        additionalControls={
          <Stack direction="row" spacing={2} sx={{ ml: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={showRunsheet}
                  onChange={(e) => setShowRunsheet(e.target.checked)}
                  sx={{
                    color: "white",
                    "&.Mui-checked": {
                      color: "white",
                    },
                    "& .MuiSvgIcon-root": {
                      color: "white",
                    },
                  }}
                />
              }
              label="Show Runsheet"
              sx={{ color: "white" }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={showPreorders}
                  onChange={(e) => setShowPreorders(e.target.checked)}
                  sx={{
                    color: "white",
                    "&.Mui-checked": {
                      color: "white",
                    },
                    "& .MuiSvgIcon-root": {
                      color: "white",
                    },
                  }}
                />
              }
              label="Show Preorders"
              sx={{ color: "white" }}
            />
          </Stack>
        }
      />

      {/* Print View */}
      {showPrintView ? (
        <Box
          className="runsheet-print-view"
          sx={{
            "@media print": {
              "& .no-print": { display: "none !important" },
            },
          }}
        >
          <Box className="no-print" sx={{ mb: 2 }}>
            <Button variant="outlined" onClick={() => setShowPrintView(false)}>
              Back to View
            </Button>
          </Box>

          {/* Runsheet Section */}
          {showRunsheet && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h4" sx={{ mb: 2, fontWeight: "bold", borderBottom: "3px solid black", pb: 1 }}>
                Runsheet - {formatDisplayDate(selectedDate)}
              </Typography>
              {filteredBookings.map((booking: Booking) => {
                const bookingName = `${booking.firstName || ""} ${booking.lastName || ""}`.trim() || "Unnamed booking"
                const typeName = resolveBookingTypeName(booking.bookingType)
                return (
                  <Box key={booking.id} sx={{ mb: 2, p: 2, border: "1px solid #ccc", pageBreakInside: "avoid" }}>
                    <Typography variant="h6" fontWeight="bold">
                      {bookingName}
                    </Typography>
                    {booking.tableNumber && <Typography>Table: {booking.tableNumber}</Typography>}
                    <Typography>Time: {booking.arrivalTime}</Typography>
                    <Typography>Guests: {booking.guests || booking.covers}</Typography>
                    <Typography>Type: {typeName}</Typography>
                    {booking.notes && <Typography>Notes: {booking.notes}</Typography>}
                    {booking.specialRequests && <Typography>Special Requests: {booking.specialRequests}</Typography>}
                    {booking.dietaryRequirements && <Typography>Dietary: {booking.dietaryRequirements}</Typography>}
                  </Box>
                )
              })}
            </Box>
          )}

          {/* Preorders Section */}
          {showPreorders && (
            <Box>
              <Typography variant="h4" sx={{ mb: 2, fontWeight: "bold", borderBottom: "3px solid black", pb: 1 }}>
                Preorders - {formatDisplayDate(selectedDate)}
              </Typography>
              {filteredBookings
                .filter((booking: Booking) => booking.preorder && booking.preorder.items && booking.preorder.items.length > 0)
                .map((booking: Booking) => {
                  const bookingName = `${booking.firstName || ""} ${booking.lastName || ""}`.trim() || "Unnamed booking"
                  return (
                    <Box key={booking.id} sx={{ mb: 2, p: 2, border: "1px solid #ccc", pageBreakInside: "avoid" }}>
                      <Typography variant="h6" fontWeight="bold">
                        {bookingName}
                      </Typography>
                      {booking.preorder?.items && Array.isArray(booking.preorder.items) && (
                        <Box>
                          {booking.preorder.items.map((item: any, idx: number) => (
                            <Typography key={idx}>
                              {resolveProductName(item.itemId)}{" "}
                              {item.quantityPerPerson ? `x${item.quantityPerPerson} per person` : ""} ({item.requirement || "optional"})
                            </Typography>
                          ))}
                        </Box>
                      )}
                      {booking.preorder?.notes && (
                        <Typography>Preorder Notes: {booking.preorder.notes}</Typography>
                      )}
                    </Box>
                  )
                })}
            </Box>
          )}

          {/* Print Styles */}
          <style>
            {`
              @media print {
                @page {
                  size: ${settings.pageSize};
                  margin: ${settings.margin}mm;
                }
                body * {
                  visibility: hidden;
                }
                .runsheet-print-view,
                .runsheet-print-view * {
                  visibility: visible;
                }
                .runsheet-print-view {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                }
                .no-print {
                  display: none !important;
                }
              }
            `}
          </style>
        </Box>
      ) : (
        <Box>
          {filteredBookings.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: "center" }}>
              <Typography color="text.secondary">No bookings</Typography>
            </Paper>
          ) : (
            <Box>
              {/* Runsheet Section */}
              {showRunsheet && (
                <Paper sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
                    Runsheet - {formatDisplayDate(selectedDate)}
                  </Typography>
                  {filteredBookings.map((booking: Booking) => {
                    const bookingName = `${booking.firstName || ""} ${booking.lastName || ""}`.trim() || "Unnamed booking"
                    const typeName = resolveBookingTypeName(booking.bookingType)
                    return (
                      <Box key={booking.id} sx={{ mb: 2, p: 2, border: "1px solid #ccc", borderRadius: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {bookingName}
                        </Typography>
                        {booking.tableNumber && <Typography variant="body2">Table: {booking.tableNumber}</Typography>}
                        <Typography variant="body2">Time: {booking.arrivalTime}</Typography>
                        <Typography variant="body2">Guests: {booking.guests || booking.covers}</Typography>
                        <Typography variant="body2">Type: {typeName}</Typography>
                        {booking.notes && <Typography variant="body2" color="text.secondary">Notes: {booking.notes}</Typography>}
                        {booking.specialRequests && <Typography variant="body2" color="text.secondary">Special Requests: {booking.specialRequests}</Typography>}
                        {booking.dietaryRequirements && <Typography variant="body2" color="text.secondary">Dietary: {booking.dietaryRequirements}</Typography>}
                      </Box>
                    )
                  })}
                </Paper>
              )}

              {/* Preorders Section */}
              {showPreorders && (
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
                    Preorders - {formatDisplayDate(selectedDate)}
                  </Typography>
                  {filteredBookings
                    .filter((booking: Booking) => booking.preorder && booking.preorder.items && booking.preorder.items.length > 0)
                    .length === 0 ? (
                    <Typography color="text.secondary">No preorders for this date</Typography>
                  ) : (
                    filteredBookings
                      .filter((booking: Booking) => booking.preorder && booking.preorder.items && booking.preorder.items.length > 0)
                      .map((booking: Booking) => {
                        const bookingName = `${booking.firstName || ""} ${booking.lastName || ""}`.trim() || "Unnamed booking"
                        return (
                          <Box key={booking.id} sx={{ mb: 2, p: 2, border: "1px solid #ccc", borderRadius: 1 }}>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {bookingName}
                            </Typography>
                            {booking.preorder?.items && Array.isArray(booking.preorder.items) && (
                              <Box sx={{ mt: 1 }}>
                                {booking.preorder.items.map((item: any, idx: number) => (
                                  <Typography key={idx} variant="body2">
                                    {resolveProductName(item.itemId)}{" "}
                                    {item.quantityPerPerson ? `x${item.quantityPerPerson} per person` : ""} ({item.requirement || "optional"})
                                  </Typography>
                                ))}
                              </Box>
                            )}
                            {booking.preorder?.notes && (
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Preorder Notes: {booking.preorder.notes}
                              </Typography>
                            )}
                          </Box>
                        )
                      })
                  )}
                </Paper>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Print Settings</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Header Color"
              type="color"
              value={settings.runsheetHeaderColor}
              onChange={(e) => updateSettings({ runsheetHeaderColor: e.target.value })}
              fullWidth
            />
            <TextField
              label="Text Color"
              type="color"
              value={settings.runsheetTextColor}
              onChange={(e) => updateSettings({ runsheetTextColor: e.target.value })}
              fullWidth
            />
            <TextField
              label="Border Color"
              type="color"
              value={settings.runsheetBorderColor}
              onChange={(e) => updateSettings({ runsheetBorderColor: e.target.value })}
              fullWidth
            />
            <TextField
              label="Logo URL"
              value={settings.runsheetLogoUrl}
              onChange={(e) => updateSettings({ runsheetLogoUrl: e.target.value })}
              fullWidth
            />
            <TextField
              label="Font Size"
              type="number"
              value={settings.runsheetFontSize}
              onChange={(e) => updateSettings({ runsheetFontSize: Number(e.target.value) })}
              fullWidth
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={settings.showHeaders}
                  onChange={(e) => updateSettings({ showHeaders: e.target.checked })}
                />
              }
              label="Show Headers"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={settings.showLogos}
                  onChange={(e) => updateSettings({ showLogos: e.target.checked })}
                />
              }
              label="Show Logos"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default RunsheetsTool

