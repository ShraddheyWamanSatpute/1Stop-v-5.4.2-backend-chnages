"use client"

import type React from "react"
import { useState, useMemo } from "react"
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Divider,
  Chip,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Paper,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,

} from "@mui/material"
import {
  ShoppingCart as ShoppingCartIcon,
  ExpandMore as ExpandMoreIcon,
  Restaurant as RestaurantIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
} from "@mui/icons-material"

interface FloorFriendPreordersProps {
  bookings: any[]
}

// Utility to get field value case-insensitively
const getFieldValue = (obj: any, field: string): any => {
  if (!obj) return undefined
  const lowerCaseField = field.toLowerCase()
  const matchingKey = Object.keys(obj).find((key) => key.toLowerCase() === lowerCaseField)
  return matchingKey ? obj[matchingKey] : undefined
}

// Group preorders by type
const groupPreordersByType = (items: any[]) => {
  const grouped: Record<string, any[]> = {
    Starters: [],
    Mains: [],
    Desserts: [],
    Drinks: [],
    Other: [],
  }
  
  items.forEach((item) => {
    const normalizedType = item.type?.toLowerCase()
    if (normalizedType === "starter" || normalizedType === "appetizer") {
      grouped.Starters.push(item)
    } else if (normalizedType === "main" || normalizedType === "entree") {
      grouped.Mains.push(item)
    } else if (normalizedType === "dessert") {
      grouped.Desserts.push(item)
    } else if (normalizedType === "drink" || normalizedType === "beverage") {
      grouped.Drinks.push(item)
    } else {
      grouped.Other.push(item)
    }
  })
  
  return grouped
}

const FloorFriendPreorders: React.FC<FloorFriendPreordersProps> = ({ bookings }) => {
  const [globalSearch, setGlobalSearch] = useState("")
  const [preorderFilter, setPreorderFilter] = useState("all")

  const normalizedSearch = globalSearch.toLowerCase()

  // Extract preorders from bookings
  const preordersData = useMemo(() => {
    const preorders: any[] = []
    
    bookings.forEach((booking) => {
      const preorderItems = getFieldValue(booking, "preorders") || 
                           getFieldValue(booking, "preOrderItems") ||
                           getFieldValue(booking, "menuItems") || []
      
      if (Array.isArray(preorderItems) && preorderItems.length > 0) {
        const customerName = getFieldValue(booking, "customerName") || getFieldValue(booking, "name") || "Unknown"
        const tableNumber = getFieldValue(booking, "tableNumber") || "N/A"
        const time = getFieldValue(booking, "time") || getFieldValue(booking, "bookingTime") || ""
        
        preorderItems.forEach((item) => {
          preorders.push({
            ...item,
            customerName,
            tableNumber,
            bookingTime: time,
            bookingId: booking.id
          })
        })
      }
    })
    
    return preorders
  }, [bookings])

  // Filter preorders
  const filteredPreorders = useMemo(() => {
    return preordersData.filter((preorder) => {
      // Global search filter
      if (normalizedSearch) {
        const searchableFields = [
          preorder.customerName,
          preorder.itemName,
          preorder.name,
          preorder.description,
          preorder.tableNumber,
          preorder.type,
        ]
        
        const matchesSearch = searchableFields.some(field => 
          String(field || "").toLowerCase().includes(normalizedSearch)
        )
        if (!matchesSearch) return false
      }

      // Type filter
      if (preorderFilter !== "all") {
        const itemType = preorder.type?.toLowerCase()
        if (preorderFilter === "starters" && !(itemType === "starter" || itemType === "appetizer")) return false
        if (preorderFilter === "mains" && !(itemType === "main" || itemType === "entree")) return false
        if (preorderFilter === "desserts" && itemType !== "dessert") return false
        if (preorderFilter === "drinks" && !(itemType === "drink" || itemType === "beverage")) return false
      }

      return true
    })
  }, [preordersData, normalizedSearch, preorderFilter])

  // Group filtered preorders by type
  const groupedPreorders = useMemo(() => {
    return groupPreordersByType(filteredPreorders)
  }, [filteredPreorders])

  // Get summary counts
  const totalItems = filteredPreorders.length
  const totalTables = new Set(filteredPreorders.map(p => p.tableNumber)).size

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <ShoppingCartIcon />
        Preorders
      </Typography>

      {/* Summary */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <Typography variant="h6" color="primary">
              {totalItems}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Items
            </Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="h6" color="primary">
              {totalTables}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tables with Preorders
            </Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="h6" color="primary">
              {groupedPreorders.Starters.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Starters
            </Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="h6" color="primary">
              {groupedPreorders.Mains.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Mains
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Search preorders"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter by Type</InputLabel>
              <Select
                value={preorderFilter}
                label="Filter by Type"
                onChange={(e) => setPreorderFilter(e.target.value)}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="starters">Starters</MenuItem>
                <MenuItem value="mains">Mains</MenuItem>
                <MenuItem value="desserts">Desserts</MenuItem>
                <MenuItem value="drinks">Drinks</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Grouped Preorders */}
      {Object.entries(groupedPreorders).map(([type, items]) => {
        if (items.length === 0) return null

        return (
          <Accordion key={type} defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <RestaurantIcon />
                {type} ({items.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                {items.map((item, index) => (
                  <Grid item xs={12} sm={6} md={4} key={`${item.bookingId}-${index}`}>
                    <Card>
                      <CardContent>
                        <Stack spacing={1}>
                          {/* Item Name */}
                          <Typography variant="h6" component="h3">
                            {item.itemName || item.name || "Unknown Item"}
                          </Typography>

                          {/* Customer and Table Info */}
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <PersonIcon fontSize="small" color="action" />
                            <Typography variant="body2">
                              {item.customerName} - Table {item.tableNumber}
                            </Typography>
                          </Box>

                          {/* Booking Time */}
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <ScheduleIcon fontSize="small" color="action" />
                            <Typography variant="body2">{item.bookingTime}</Typography>
                          </Box>

                          {/* Quantity */}
                          {item.quantity && (
                            <Typography variant="body2" fontWeight="bold">
                              Quantity: {item.quantity}
                            </Typography>
                          )}

                          {/* Price */}
                          {item.price && (
                            <Typography variant="body2" color="primary">
                              £{item.price}
                            </Typography>
                          )}

                          {/* Description/Notes */}
                          {item.description && (
                            <>
                              <Divider />
                              <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                                {item.description}
                              </Typography>
                            </>
                          )}

                          {/* Special Requirements */}
                          {item.specialRequirements && (
                            <Chip 
                              label={item.specialRequirements} 
                              size="small" 
                              color="warning"
                              variant="outlined"
                            />
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </AccordionDetails>
          </Accordion>
        )
      })}

      {filteredPreorders.length === 0 && (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <ShoppingCartIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No preorders found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {globalSearch || preorderFilter !== "all"
              ? "Try adjusting your search or filter criteria"
              : "No preorders available for today"}
          </Typography>
        </Paper>
      )}
    </Box>
  )
}

export default FloorFriendPreorders
