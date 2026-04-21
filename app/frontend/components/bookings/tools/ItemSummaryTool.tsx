"use client"

import React, { useState, useEffect, useMemo } from "react"
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material"
import { Print, Restaurant, ExpandMore } from "@mui/icons-material"
import { useBookings } from "../../../../backend/context/BookingsContext"
import { Booking } from "../../../../backend/interfaces/Bookings"
import DataHeader, { FilterOption } from "../../reusable/DataHeader"

const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

interface AggregatedData {
  name: string
  quantity: number
  type: string
  variations?: Record<string, number>
}

const ItemSummaryTool: React.FC = () => {
  const { bookings, fetchBookingsByDate, loading: bookingsLoading } = useBookings()
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [itemSummaries, setItemSummaries] = useState<Record<string, AggregatedData[]>>({})
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [sortOption, setSortOption] = useState<string>("name")
  const [filtersExpanded, setFiltersExpanded] = useState(false)

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
      calculateSummaries(dateBookings)
    } else {
      setItemSummaries({})
    }
  }, [bookings, selectedDate, sortOption])

  const calculateSummaries = (dateBookings: Booking[]) => {
    const itemMap: Record<string, AggregatedData> = {}

    dateBookings.forEach((booking: Booking) => {
      if (!booking.preorder || !booking.preorder.items) return
      
      const items = booking.preorder.items
      const guestCount = booking.guests || booking.covers || 1
      
      items.forEach((item: any) => {
        if (!item.itemId) return

        // Calculate quantity: if perPerson is true, multiply by guest count
        // Otherwise use quantityPerPerson directly (defaults to 1 if not specified)
        const quantity = item.perPerson && item.quantityPerPerson 
          ? guestCount * (item.quantityPerPerson || 1)
          : (item.quantityPerPerson || 1)
        
        const key = `${item.requirement || "optional"}_${item.itemId}`

        if (!itemMap[key]) {
          itemMap[key] = {
            name: `Item ${item.itemId}`,
            quantity: 0,
            type: item.requirement === "required" ? "Required" : item.requirement === "optional" ? "Optional" : "Other",
          }
        }
        itemMap[key].quantity += quantity
      })
    })

    const groupedItems = groupItemsByType(Object.values(itemMap))
    
    Object.keys(groupedItems).forEach((type) => {
      if (sortOption === "name") {
        groupedItems[type].sort((a, b) => a.name.localeCompare(b.name))
      } else if (sortOption === "quantity") {
        groupedItems[type].sort((a, b) => b.quantity - a.quantity)
      }
    })

    setItemSummaries(groupedItems)
  }

  const groupItemsByType = (items: AggregatedData[]): Record<string, AggregatedData[]> => {
    const grouped: Record<string, AggregatedData[]> = {
      Required: [],
      Optional: [],
      Other: [],
    }

    items.forEach((item) => {
      const type = item.type || "Other"
      if (type === "Required") grouped.Required.push(item)
      else if (type === "Optional") grouped.Optional.push(item)
      else grouped.Other.push(item)
    })

    return grouped
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      Required: "error",
      Optional: "warning",
      Other: "default",
    }
    return colors[type] || "default"
  }

  const getTotalItems = (type: string) => {
    return itemSummaries[type]?.reduce((sum, item) => sum + item.quantity, 0) || 0
  }

  const typeFilterOptions: FilterOption[] = useMemo(() => {
    return Object.keys(itemSummaries).map(type => ({ id: type, name: type }))
  }, [itemSummaries])

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

  const typesToRender = selectedTypes.length === 0 ? Object.keys(itemSummaries) : selectedTypes

  return (
    <Box>
      <DataHeader
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        dateType="day"
        showDateTypeSelector={false}
        filters={[
          {
            label: "Type",
            options: typeFilterOptions,
            selectedValues: selectedTypes,
            onSelectionChange: setSelectedTypes,
          },
        ]}
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded(!filtersExpanded)}
        sortOptions={[
          { value: "name", label: "Name (A-Z)" },
          { value: "quantity", label: "Quantity (High-Low)" },
        ]}
        sortValue={sortOption}
        onSortChange={(value) => setSortOption(value)}
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

      <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        {typesToRender.map((type) => {
          const items = itemSummaries[type] || []
          if (items.length === 0) return null

          return (
            <Card key={type} sx={{ flex: "1 1 300px", minWidth: "250px" }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Restaurant color="primary" />
                    <Typography variant="h6" fontWeight="bold">
                      {type}
                    </Typography>
                  </Box>
                  <Chip
                    label={`${getTotalItems(type)} total`}
                    color={getTypeColor(type) as any}
                    size="small"
                    variant="outlined"
                  />
                </Box>

                <Box sx={{ maxHeight: 300, overflowY: "auto" }}>
                  {items.map((item, index) => (
                    <Box key={`${type}-${index}`}>
                      {item.variations ? (
                        <Accordion sx={{ mb: 1, boxShadow: 1 }}>
                          <AccordionSummary expandIcon={<ExpandMore />}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
                              <Typography variant="body2" fontWeight="medium">
                                {item.name}
                              </Typography>
                              <Chip
                                label={`×${item.quantity}`}
                                size="small"
                                color={getTypeColor(type) as any}
                                variant="filled"
                                sx={{ mr: 1 }}
                              />
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                              {Object.entries(item.variations).map(([variation, qty]) => (
                                <Box
                                  key={variation}
                                  sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    p: 1,
                                    bgcolor: "background.default",
                                    borderRadius: 1,
                                  }}
                                >
                                  <Typography variant="caption" color="text.secondary">
                                    {variation}
                                  </Typography>
                                  <Chip label={`×${qty}`} size="small" variant="outlined" />
                                </Box>
                              ))}
                            </Box>
                          </AccordionDetails>
                        </Accordion>
                      ) : (
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 1.5,
                            mb: 1,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            bgcolor: "background.default",
                            "&:hover": { bgcolor: "action.hover" },
                          }}
                        >
                          <Typography variant="body2" sx={{ flex: 1 }}>
                            {item.name}
                          </Typography>
                          <Chip
                            label={`×${item.quantity}`}
                            size="small"
                            color={getTypeColor(type) as any}
                            variant="filled"
                          />
                        </Paper>
                      )}
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          )
        })}
      </Box>

      {Object.keys(itemSummaries).length === 0 && !loading && (
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Typography color="text.secondary">No bookings</Typography>
        </Paper>
      )}
    </Box>
  )
}

export default ItemSummaryTool

