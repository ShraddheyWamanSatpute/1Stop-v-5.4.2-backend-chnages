"use client"

import React, { useState, useEffect, useMemo } from "react"
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
} from "@mui/material"
import { Print, Settings } from "@mui/icons-material"
import { usePrintSettings } from "./ToolsPrintSettings"
import { useBookings } from "../../../../backend/context/BookingsContext"
import { useStock } from "../../../../backend/context/StockContext"
import { Booking } from "../../../../backend/interfaces/Bookings"
import DataHeader from "../../reusable/DataHeader"

const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}


interface GuestPreorder {
  name: string
  items: any[]
  bookingId: string
  bookingName: string
}

const PlaceCardsTool: React.FC = () => {
  const { settings, updateSettings } = usePrintSettings()
  const { bookings, fetchBookingsByDate, loading: bookingsLoading } = useBookings()
  const { state: stockState } = useStock()
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [selectedBookings, setSelectedBookings] = useState<Set<string>>(new Set())
  const [guestPreorders, setGuestPreorders] = useState<GuestPreorder[]>([])
  const [loading, setLoading] = useState(true)
  const [showPrintView, setShowPrintView] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [timeFilter, setTimeFilter] = useState("all")
  const [showBookingHeaders, setShowBookingHeaders] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        await fetchBookingsByDate(selectedDate)
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [selectedDate, fetchBookingsByDate])

  useEffect(() => {
    const dateBookings = bookings.filter((booking: Booking) => booking.date === selectedDate)
    
    // Process bookings with preorders into guest preorders
    const guests: GuestPreorder[] = []
    
    dateBookings.forEach((booking: Booking) => {
      if (!booking.preorder || !booking.preorder.items || booking.preorder.items.length === 0) return
      
      const bookingName = `${booking.firstName || ""} ${booking.lastName || ""}`.trim() || "Unnamed booking"
      
      // For place cards, we'll create one card per booking with preorder items
      // If the preorder has guest-specific data, we can expand this later
      guests.push({
        name: bookingName,
        items: booking.preorder.items,
        bookingId: booking.id,
        bookingName: bookingName,
      })
    })
    
    setGuestPreorders(guests)
  }, [bookings, selectedDate])

  const dateBookings = useMemo(() => {
    return bookings.filter((booking: Booking) => booking.date === selectedDate)
  }, [bookings, selectedDate])

  const availableTimes = [...new Set(dateBookings.map(b => b.arrivalTime).filter(Boolean))].sort()

  const filteredAndSortedBookings = dateBookings
    .filter((booking: Booking) => {
      const bookingName = `${booking.firstName || ""} ${booking.lastName || ""}`.trim() || "Unnamed booking"
      if (searchTerm && !bookingName.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }
      if (timeFilter !== "all" && booking.arrivalTime !== timeFilter) {
        return false
      }
      // Only show bookings with preorders
      if (!booking.preorder || !booking.preorder.items || booking.preorder.items.length === 0) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      const nameA = `${a.firstName || ""} ${a.lastName || ""}`.trim()
      const nameB = `${b.firstName || ""} ${b.lastName || ""}`.trim()
      return nameA.localeCompare(nameB)
    })

  const handleToggleBooking = (bookingId: string) => {
    setSelectedBookings((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(bookingId)) {
        newSet.delete(bookingId)
      } else {
        newSet.add(bookingId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    const filteredBookingIds = filteredAndSortedBookings.map(b => b.id)
    const allFilteredSelected = filteredBookingIds.every(id => selectedBookings.has(id))
    
    if (allFilteredSelected) {
      setSelectedBookings(prev => {
        const newSet = new Set(prev)
        filteredBookingIds.forEach(id => newSet.delete(id))
        return newSet
      })
    } else {
      setSelectedBookings(prev => {
        const newSet = new Set(prev)
        filteredBookingIds.forEach(id => newSet.add(id))
        return newSet
      })
    }
  }

  const filteredGuests = guestPreorders.filter((guest) => selectedBookings.has(guest.bookingId))

  const guestsByBooking = filteredGuests.reduce((groups, guest) => {
    const bookingId = guest.bookingId
    if (!groups[bookingId]) {
      groups[bookingId] = []
    }
    groups[bookingId].push(guest)
    return groups
  }, {} as Record<string, GuestPreorder[]>)

  const handleShowPrintView = () => {
    if (selectedBookings.size === 0) {
      setErrorMessage("Please select at least one booking to print place cards")
      return
    }
    setShowPrintView(true)
  }

  const handlePrint = () => {
    window.print()
  }

  // Calculate card dimensions based on cards per page
  const getCardDimensions = () => {
    const cardsPerPage = settings.placeCardsPerPage
    const cardsPerRow = Math.sqrt(cardsPerPage) === Math.floor(Math.sqrt(cardsPerPage)) 
      ? Math.sqrt(cardsPerPage) 
      : Math.ceil(Math.sqrt(cardsPerPage))
    const cardsPerCol = Math.ceil(cardsPerPage / cardsPerRow)
    
    // A4 dimensions: 210mm x 297mm
    const pageWidth = 210
    const pageHeight = 297
    const margin = 5
    const cardWidth = (pageWidth - margin * 2) / cardsPerRow
    const cardHeight = (pageHeight - margin * 2) / cardsPerCol
    
    return { cardWidth, cardHeight, cardsPerRow, cardsPerCol }
  }

  const { cardWidth, cardHeight, cardsPerRow } = getCardDimensions()

  const timeFilterOptions = useMemo(() => {
    return availableTimes.map(time => ({ id: time, name: time }))
  }, [availableTimes])

  if (loading || bookingsLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!showPrintView) {
    return (
      <Box>
        <Snackbar open={!!errorMessage} autoHideDuration={4000} onClose={() => setErrorMessage(null)}>
          <Alert severity="error" onClose={() => setErrorMessage(null)}>
            {errorMessage}
          </Alert>
        </Snackbar>
        <DataHeader
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          dateType="day"
          showDateTypeSelector={false}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search bookings..."
          filters={[
            {
              label: "Time",
              options: [{ id: "all", name: "All Times" }, ...timeFilterOptions],
              selectedValues: timeFilter === "all" ? [] : [timeFilter],
              onSelectionChange: (values) => setTimeFilter(values.length === 0 ? "all" : values[0]),
            },
          ]}
          additionalButtons={[
            {
              label: "Settings",
              icon: <Settings />,
              onClick: () => setSettingsOpen(true),
              variant: "outlined",
            },
            {
              label: filteredAndSortedBookings.every(b => selectedBookings.has(b.id)) ? "Deselect All" : "Select All",
              icon: null,
              onClick: handleSelectAll,
              variant: "outlined",
            },
            {
              label: `Preview Place Cards (${filteredGuests.length} cards)`,
              icon: <Print />,
              onClick: handleShowPrintView,
              variant: "contained",
              color: "primary",
            },
          ]}
        />

        <Paper sx={{ p: 2 }}>
          {filteredAndSortedBookings.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 3 }}>
              <Typography color="text.secondary">No bookings</Typography>
            </Box>
          ) : (
            filteredAndSortedBookings.map((booking: Booking) => {
              const bookingName = `${booking.firstName || ""} ${booking.lastName || ""}`.trim() || "Unnamed booking"
              return (
                <FormControlLabel
                  key={booking.id}
                  control={
                    <Checkbox
                      checked={selectedBookings.has(booking.id)}
                      onChange={() => handleToggleBooking(booking.id)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight="bold">
                        {bookingName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {booking.tableNumber && `Table: ${booking.tableNumber}`}
                        {booking.arrivalTime && ` | Time: ${booking.arrivalTime}`}
                        {(booking.guests || booking.covers) && ` | Guests: ${booking.guests || booking.covers}`}
                      </Typography>
                    </Box>
                  }
                />
              )
            })
          )}
        </Paper>

        <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Place Card Settings</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <FormControl fullWidth>
                <InputLabel>Cards Per Page</InputLabel>
                <Select
                  value={settings.placeCardsPerPage}
                  onChange={(e) => updateSettings({ placeCardsPerPage: Number(e.target.value) })}
                  label="Cards Per Page"
                >
                  <MenuItem value={3}>3 cards</MenuItem>
                  <MenuItem value={4}>4 cards</MenuItem>
                  <MenuItem value={6}>6 cards</MenuItem>
                  <MenuItem value={9}>9 cards</MenuItem>
                  <MenuItem value={12}>12 cards</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Logo URL"
                value={settings.placeCardLogoUrl}
                onChange={(e) => updateSettings({ placeCardLogoUrl: e.target.value })}
                fullWidth
              />
              <TextField
                label="Text Color"
                type="color"
                value={settings.placeCardTextColor}
                onChange={(e) => updateSettings({ placeCardTextColor: e.target.value })}
                fullWidth
              />
              <TextField
                label="Border Color"
                type="color"
                value={settings.placeCardBorderColor}
                onChange={(e) => updateSettings({ placeCardBorderColor: e.target.value })}
                fullWidth
              />
              <TextField
                label="Background Color"
                type="color"
                value={settings.placeCardBackgroundColor}
                onChange={(e) => updateSettings({ placeCardBackgroundColor: e.target.value })}
                fullWidth
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={showBookingHeaders}
                    onChange={(e) => setShowBookingHeaders(e.target.checked)}
                  />
                }
                label="Show Booking Headers"
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

  return (
    <Box>
      <Box className="no-print" sx={{ p: 2, textAlign: "center" }}>
        <Button variant="outlined" onClick={() => setShowPrintView(false)} sx={{ mr: 2, mb: 2 }}>
          Back to Selection
        </Button>
        <Button variant="contained" color="primary" onClick={handlePrint} sx={{ mb: 2 }}>
          Print Place Cards
        </Button>
        <FormControlLabel
          control={
            <Checkbox
              checked={showBookingHeaders}
              onChange={(e) => setShowBookingHeaders(e.target.checked)}
            />
          }
          label="Show booking headers when printing"
          sx={{ ml: 2, mb: 2 }}
        />
        <Typography variant="body2" color="text.secondary">
          {filteredGuests.length} place cards for {selectedDate}
        </Typography>
      </Box>

      <Box 
        className="place-cards-container" 
        sx={{ 
          width: "210mm", 
          margin: "0 auto"
        }}
      >
        {Object.entries(guestsByBooking).map(([bookingId, guests]) => {
          const booking = dateBookings.find(b => b.id === bookingId)
          const bookingName = booking ? `${booking.firstName || ""} ${booking.lastName || ""}`.trim() || "Unnamed booking" : "Unnamed booking"
          
          return (
            <Box key={bookingId} sx={{ mb: 0, pageBreakInside: "avoid" }}>
              {showBookingHeaders && (
                <Box sx={{ 
                  mb: 0, 
                  p: 2, 
                  backgroundColor: "#f5f5f5", 
                  border: "2px solid #000",
                  "@media print": { backgroundColor: "#f0f0f0" }
                }}>
                  <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                    {bookingName}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Table:</strong> {booking?.tableNumber || "N/A"} | <strong>Time:</strong> {booking?.arrivalTime || "N/A"}
                  </Typography>
                </Box>
              )}

              <Box sx={{
                display: "grid",
                gridTemplateColumns: `repeat(${cardsPerRow}, 1fr)`,
                gap: "0",
                mb: 0
              }}>
                {guests.map((guest, index) => (
                  <Box
                    key={`${guest.bookingId}-${guest.name}-${index}`}
                    sx={{
                      width: `${cardWidth}mm`,
                      height: `${cardHeight}mm`,
                      border: `2px solid ${settings.placeCardBorderColor}`,
                      display: "flex",
                      flexDirection: "column",
                      pageBreakInside: "avoid",
                      backgroundColor: settings.placeCardBackgroundColor,
                    }}
                  >
                    <Box
                      sx={{
                        height: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderBottom: "1px dashed #ccc",
                        padding: "4mm",
                      }}
                    >
                      {settings.showLogos && settings.placeCardLogoUrl && (
                        <img
                          src={settings.placeCardLogoUrl}
                          alt="Logo"
                          style={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                            objectFit: "contain",
                          }}
                        />
                      )}
                    </Box>

                    <Box
                      sx={{
                        height: "50%",
                        padding: "3mm",
                        display: "flex",
                        flexDirection: "column",
                        gap: "2mm",
                        overflow: "hidden",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "5mm",
                          fontWeight: "bold",
                          textAlign: "center",
                          color: settings.placeCardTextColor,
                        }}
                      >
                        {guest.name.replace(/\s*\([^)]*\)\s*$/, '').trim()}
                      </Typography>

                      <Box sx={{ display: "flex", flexDirection: "column", gap: "0.5mm", textAlign: "center" }}>
                        {guest.items && guest.items.map((item: any, i: number) => (
                          <Typography key={i} sx={{ fontSize: "3mm", color: settings.placeCardTextColor }}>
                            {resolveProductName(item.itemId)} {item.quantityPerPerson ? `x${item.quantityPerPerson}` : ""}
                          </Typography>
                        ))}
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          )
        })}
      </Box>

      <style>
        {`
          @media print {
            @page {
              size: A4;
              margin: 0;
            }
            body * {
              visibility: hidden;
            }
            .place-cards-container,
            .place-cards-container * {
              visibility: visible;
            }
            .place-cards-container {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            nav,
            header,
            .MuiAppBar-root,
            .no-print,
            button,
            .MuiButton-root {
              display: none !important;
            }
            body {
              margin: 0;
              padding: 0;
              background: white;
            }
          }
        `}
      </style>
    </Box>
  )
}

export default PlaceCardsTool

