"use client"

import { themeConfig } from "../../../../theme/AppTheme";
import React, { useState, useEffect } from "react"
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Card,
  CardContent,
} from "@mui/material"
import { Print } from "@mui/icons-material"
import { useBookings } from "../../../../backend/context/BookingsContext"
import { Booking } from "../../../../backend/interfaces/Bookings"
import DataHeader from "../../reusable/DataHeader"

const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

interface AggregatedData {
  time: string
  type: string
  totalGuests: number
}

const NumbersTableTool: React.FC = () => {
  const { bookings, bookingTypes, fetchBookingsByDate, loading: bookingsLoading } = useBookings()
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [groupedData, setGroupedData] = useState<Record<string, AggregatedData[]>>({})
  const [timeOrder, setTimeOrder] = useState<string[]>([])

  const selectedDate = formatDate(currentDate)

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

  useEffect(() => {
    const dateBookings = bookings.filter((booking: Booking) => booking.date === selectedDate)
    if (dateBookings.length > 0) {
      aggregateBookings(dateBookings)
    } else {
      setGroupedData({})
      setTimeOrder([])
    }
  }, [bookings, selectedDate, bookingTypes])

  const aggregateBookings = (bookingsData: Booking[]) => {
    const aggregated: AggregatedData[] = []

    bookingsData.forEach((booking: Booking) => {
      const time = booking.arrivalTime || ""
      const typeName = bookingTypes.find(bt => bt.id === booking.bookingType)?.name || booking.bookingType || "Standard"
      const guests = booking.guests || booking.covers || 0

      if (!time || guests === 0) return

      const existingEntry = aggregated.find((entry) => entry.time === time && entry.type === typeName)
      if (existingEntry) {
        existingEntry.totalGuests += guests
      } else {
        aggregated.push({ time, type: typeName, totalGuests: guests })
      }
    })

    const sortedAggregated = aggregated.sort((a, b) => a.time.localeCompare(b.time))

    const validTimes = sortedAggregated.filter((entry) => {
      const time = entry.time
      return (time >= "11:00" && time <= "23:59") || (time >= "00:00" && time <= "06:00")
    })

    const grouped: Record<string, AggregatedData[]> = {}
    validTimes.forEach((entry) => {
      if (!grouped[entry.type]) {
        grouped[entry.type] = []
      }
      grouped[entry.type].push(entry)
    })

    const validTimeOrder = Array.from(new Set(validTimes.map((entry) => entry.time))).sort((a, b) => {
      if (a >= "12:00" && b >= "12:00") return a.localeCompare(b)
      if (a < "12:00" && b < "12:00") return a.localeCompare(b)
      return a >= "12:00" ? -1 : 1
    })

    setGroupedData(grouped)
    setTimeOrder(validTimeOrder)
  }


  const getTotalForType = (type: string) => {
    return groupedData[type]?.reduce((sum, entry) => sum + entry.totalGuests, 0) || 0
  }

  const getGrandTotal = () => {
    return Object.values(groupedData)
      .flat()
      .reduce((sum, entry) => sum + entry.totalGuests, 0)
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
        additionalButtons={[
          {
            label: "Print",
            icon: <Print />,
            onClick: () => window.print(),
            variant: "contained",
            color: "primary",
          },
        ]}
      />

      {Object.keys(groupedData).length > 0 ? (
        <Card id="printable-content">
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6" fontWeight="bold">
                Guest Count Summary
              </Typography>
              <Chip label={`Total: ${getGrandTotal()} guests`} color="primary" variant="filled" />
            </Box>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: themeConfig.brandColors.navy }}>
                    <TableCell sx={{ color: themeConfig.brandColors.offWhite, fontWeight: "bold" }}>Time</TableCell>
                    {Object.keys(groupedData).map((type) => (
                      <TableCell
                        key={type}
                        sx={{ color: themeConfig.brandColors.offWhite, fontWeight: "bold", textAlign: "center" }}
                      >
                        {type}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {timeOrder.map((time) => (
                    <TableRow
                      key={time}
                      sx={{
                        "&:nth-of-type(odd)": { bgcolor: "action.hover" },
                        "&:hover": { bgcolor: "action.selected" },
                      }}
                    >
                      <TableCell sx={{ fontWeight: "medium" }}>{time}</TableCell>
                      {Object.keys(groupedData).map((type) => {
                        const entry = groupedData[type].find((data) => data.time === time)
                        return (
                          <TableCell key={type} sx={{ textAlign: "center" }}>
                            {entry ? entry.totalGuests : 0}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: "primary.light" }}>
                    <TableCell sx={{ fontWeight: "bold", color: themeConfig.brandColors.offWhite }}>Total</TableCell>
                    {Object.keys(groupedData).map((type) => (
                      <TableCell
                        key={type}
                        sx={{
                          fontWeight: "bold",
                          textAlign: "center",
                          color: themeConfig.brandColors.offWhite,
                        }}
                      >
                        {getTotalForType(type)}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      ) : (
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Typography color="text.secondary">No bookings</Typography>
        </Paper>
      )}
    </Box>
  )
}

export default NumbersTableTool

