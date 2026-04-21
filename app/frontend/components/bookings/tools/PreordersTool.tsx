"use client"

import React, { useState, useEffect, useMemo } from "react"
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
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


const PreordersTool: React.FC = () => {
  const { settings, updateSettings } = usePrintSettings()
  const { bookings, fetchBookingsByDate, loading: bookingsLoading } = useBookings()
  const { state: stockState } = useStock()
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [showPrintView, setShowPrintView] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<"name" | "table" | "time">("name")

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

  const dateBookings = useMemo(() => {
    return bookings.filter((booking: Booking) => booking.date === selectedDate)
  }, [bookings, selectedDate])

  const filteredAndSortedPreorders = useMemo(() => {
    return dateBookings
      .filter((booking: Booking) => {
        if (!booking.preorder || !booking.preorder.items || booking.preorder.items.length === 0) return false
        if (!searchTerm) return true
        const bookingName = `${booking.firstName} ${booking.lastName}`.trim()
        return bookingName.toLowerCase().includes(searchTerm.toLowerCase())
      })
      .map((booking: Booking) => {
        const bookingName = `${booking.firstName || ""} ${booking.lastName || ""}`.trim() || "Unnamed booking"
        return {
          id: booking.id,
          name: bookingName,
          preorder: booking.preorder,
          booking,
          tableNumber: booking.tableNumber || "",
          time: booking.arrivalTime || "",
        }
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name)
        if (sortBy === "table") {
          return String(a.tableNumber).localeCompare(String(b.tableNumber), undefined, { numeric: true })
        }
        return (a.time || "").localeCompare(b.time || "")
      })
  }, [dateBookings, searchTerm, sortBy])

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

  const groupPreordersByType = (items: any[]) => {
    // Note: Main app uses itemId references, so we'll group by requirement type
    const grouped: Record<string, any[]> = {
      Required: [],
      Optional: [],
      Other: [],
    }
    
    items.forEach((item) => {
      const requirement = item.requirement || "optional"
      if (requirement === "required") grouped.Required.push(item)
      else if (requirement === "optional") grouped.Optional.push(item)
      else grouped.Other.push(item)
    })
    
    return grouped
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
        searchPlaceholder="Search preorders..."
        sortOptions={[
          { value: "name", label: "Name" },
          { value: "table", label: "Table" },
          { value: "time", label: "Time" },
        ]}
        sortValue={sortBy}
        onSortChange={(value) => setSortBy(value as "name" | "table" | "time")}
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
      />

      {showPrintView ? (
        <Box
          className="preorders-print-view"
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

          <Typography variant="h4" sx={{ mb: 2, fontWeight: "bold", borderBottom: "3px solid black", pb: 1 }}>
            Preorders - {formatDisplayDate(selectedDate)}
          </Typography>

          {filteredAndSortedPreorders.map(({ id, name, preorder, tableNumber, time }) => {
            if (!preorder) return null
            const groupedItems = groupPreordersByType(preorder.items || [])
            
            return (
              <Box key={id} sx={{ mb: 3, p: 2, border: "2px solid #333", pageBreakInside: "avoid" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold">
                    {name}
                  </Typography>
                  <Box>
                    {tableNumber && <Typography>Table: {tableNumber}</Typography>}
                    {time && <Typography>Time: {time}</Typography>}
                  </Box>
                </Box>

                {preorder.notes && (
                  <Typography variant="body2" sx={{ mb: 2, fontStyle: "italic" }}>
                    Notes: {preorder.notes}
                  </Typography>
                )}

                {Object.entries(groupedItems).map(([type, items]) => {
                  if (items.length === 0) return null
                  return (
                    <Box key={type} sx={{ mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                        {type}
                      </Typography>
                      {items.map((item: any, idx: number) => (
                        <Typography key={idx} sx={{ ml: 2 }}>
                          {resolveProductName(item.itemId)}
                          {item.quantityPerPerson ? ` x${item.quantityPerPerson} per person` : ""}
                          {item.perPerson && ` (per person)`}
                        </Typography>
                      ))}
                    </Box>
                  )
                })}
              </Box>
            )
          })}

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
                .preorders-print-view,
                .preorders-print-view * {
                  visibility: visible;
                }
                .preorders-print-view {
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
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Typography color="text.secondary">
            {filteredAndSortedPreorders.length === 0 ? "No bookings" : ""}
          </Typography>
        </Paper>
      )}

      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Print Settings</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Header Color"
              type="color"
              value={settings.preorderHeaderColor}
              onChange={(e) => updateSettings({ preorderHeaderColor: e.target.value })}
              fullWidth
            />
            <TextField
              label="Text Color"
              type="color"
              value={settings.preorderTextColor}
              onChange={(e) => updateSettings({ preorderTextColor: e.target.value })}
              fullWidth
            />
            <TextField
              label="Border Color"
              type="color"
              value={settings.preorderBorderColor}
              onChange={(e) => updateSettings({ preorderBorderColor: e.target.value })}
              fullWidth
            />
            <TextField
              label="Logo URL"
              value={settings.preorderLogoUrl}
              onChange={(e) => updateSettings({ preorderLogoUrl: e.target.value })}
              fullWidth
            />
            <TextField
              label="Font Size"
              type="number"
              value={settings.preorderFontSize}
              onChange={(e) => updateSettings({ preorderFontSize: Number(e.target.value) })}
              fullWidth
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

export default PreordersTool

