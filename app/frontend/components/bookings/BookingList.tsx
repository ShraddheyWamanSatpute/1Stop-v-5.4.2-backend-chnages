import { themeConfig } from "../../../theme/AppTheme";
import { alpha } from "@mui/material/styles";
import React, { useState, useMemo } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  MenuItem,
  Chip,
  Menu,
  ListItemIcon,
  ListItemText
} from '@mui/material'
import {
  Person as PersonIcon,
  Group as GroupIcon,
  Circle as CircleIcon
} from '@mui/icons-material'
import { useBookings as useBookingsContext, Booking } from '../../../backend/context/BookingsContext'
// Removed unused format import

// Define tracking options and colors
const TRACKING_OPTIONS = [
  "Not Arrived",
  "Arrived", 
  "Seated",
  "Appetizers",
  "Starters",
  "Mains",
  "Desserts",
  "Bill",
  "Paid",
  "Left"
] as const

const TRACKING_COLORS: Record<string, string> = {
  "Not Arrived": "#9e9e9e",
  "Arrived": "#2196f3", 
  "Seated": "#4caf50",
  "Appetizers": "#ff9800",
  "Starters": "#ff5722",
  "Mains": "#e91e63",
  "Desserts": themeConfig.colors.primary.light,
  "Bill": themeConfig.brandColors.navy,
  "Paid": "#3f51b5",
  "Left": "#607d8b"
}

type TrackingStatus = typeof TRACKING_OPTIONS[number]

interface BookingListProps {
  selectedDate: string // Format: "yyyy-MM-dd"
  onBookingClick?: (booking: Booking) => void
  onTrackingChange?: (bookingId: string, newTracking: TrackingStatus) => void
  maxHeight?: string
  showUnassignedOnly?: boolean
  title?: string
}

const BookingList: React.FC<BookingListProps> = ({
  selectedDate,
  onBookingClick,
  onTrackingChange,
  maxHeight = '70vh',
  showUnassignedOnly = false}) => {
  const { 
    bookings: contextBookings,
    bookingTypes: contextBookingTypes,
    tables: contextTables,
    updateBooking
  } = useBookingsContext()

  const [trackingMenuAnchor, setTrackingMenuAnchor] = useState<{ element: HTMLElement; booking: Booking } | null>(null)

  // Filter bookings by selected date
  const filteredBookings = useMemo(() => {
    let bookings = contextBookings.filter(booking => {
      // Filter by date
      const bookingDate = booking.date
      if (!bookingDate) return false
      
      // Normalize booking date to YYYY-MM-DD format
      let normalizedBookingDate: string
      if (bookingDate && typeof bookingDate === 'object' && 'toISOString' in bookingDate) {
        normalizedBookingDate = (bookingDate as Date).toISOString().split('T')[0]
      } else if (typeof bookingDate === 'string') {
        const date = new Date(bookingDate)
        normalizedBookingDate = date.toISOString().split('T')[0]
      } else {
        return false
      }
      
      return normalizedBookingDate === selectedDate
    })

    // Filter for unassigned bookings if requested
    if (showUnassignedOnly) {
      bookings = bookings.filter(booking => 
        !booking.tableNumber && !booking.tableId && 
        booking.status !== "Cancelled" && booking.status !== "No-Show"
      )
    }

    // Sort by arrival time
    return bookings.sort((a, b) => {
      const timeA = a.arrivalTime || a.startTime || '00:00'
      const timeB = b.arrivalTime || b.startTime || '00:00'
      return timeA.localeCompare(timeB)
    })
  }, [contextBookings, selectedDate, showUnassignedOnly])

  // Get booking type color
  const getBookingTypeColor = (booking: Booking): string => {
    if (!booking.bookingType) return '#4caf50'
    
    const bookingType = contextBookingTypes.find(type => 
      type.name === booking.bookingType || type.id === booking.bookingType
    )
    
    return bookingType?.color || '#4caf50'
  }

  // Get tracking color
  const getTrackingColor = (tracking: string): string => {
    return TRACKING_COLORS[tracking] || '#9e9e9e'
  }

  // Handle tracking change
  const handleTrackingChange = async (booking: Booking, newTracking: TrackingStatus) => {
    try {
      if (onTrackingChange) {
        onTrackingChange(booking.id, newTracking)
      } else {
        // Default behavior - update via context
        await updateBooking(booking.id, { tracking: newTracking })
      }
    } catch (error) {
      console.error('Error updating booking tracking:', error)
    }
    setTrackingMenuAnchor(null)
  }

  // Handle tracking menu
  const handleTrackingMenuOpen = (event: React.MouseEvent<HTMLElement>, booking: Booking) => {
    event.stopPropagation()
    setTrackingMenuAnchor({ element: event.currentTarget, booking })
  }

  const handleTrackingMenuClose = () => {
    setTrackingMenuAnchor(null)
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Booking List */}
      <Box sx={{ 
        flex: 1, 
        overflow: 'auto', 
        maxHeight,
        p: 1
      }}>
        {filteredBookings.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '200px',
            color: 'text.secondary'
          }}>
            <PersonIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
            <Typography variant="body2">
              {showUnassignedOnly ? 'No unassigned bookings' : 'No bookings for this date'}
            </Typography>
          </Box>
        ) : (
          filteredBookings.map((booking) => (
            <Card
              key={booking.id}
              sx={{
                mb: 0.125,
                cursor: onBookingClick ? 'pointer' : 'default',
                backgroundColor: getBookingTypeColor(booking),
                color: 'white',
                '&:hover': onBookingClick ? {
                  transform: 'translateY(-1px)',
                  boxShadow: 2
                } : {},
                transition: 'all 0.2s ease-in-out'
              }}
              onClick={() => onBookingClick?.(booking)}
            >
              <CardContent sx={{ p: 0.25, '&:last-child': { pb: 0.25 } }}>
                {/* Row 1: Name, Guests, Time */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.125 }}>
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      fontWeight: 600, 
                      fontSize: '0.75rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                      mr: 1
                    }}
                  >
                    {booking.firstName} {booking.lastName}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 1 }}>
                    <GroupIcon sx={{ fontSize: 11, opacity: 0.8 }} />
                    <Typography variant="caption" sx={{ 
                      fontSize: '0.6rem',
                      opacity: 0.9,
                      minWidth: 'fit-content'
                    }}>
                      {booking.guests || booking.guestCount || 1}
                    </Typography>
                  </Box>

                  <Typography variant="caption" sx={{ 
                    fontSize: '0.6rem',
                    opacity: 0.9,
                    minWidth: 'fit-content'
                  }}>
                    {booking.arrivalTime || booking.startTime}
                    {(booking.endTime || booking.until) && ` - ${booking.endTime || booking.until}`}
                  </Typography>
                </Box>

                {/* Row 2: Table, Type, Tracking */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                  <Typography variant="caption" sx={{ 
                    fontSize: '0.6rem', 
                    opacity: 0.9,
                    minWidth: 'fit-content'
                  }}>
                    {(() => {
                      const tableId = booking.tableNumber || booking.tableId
                      if (!tableId) return 'Unassigned'
                      
                      // Try to find table name from context
                      const table = contextTables?.find((t: any) => 
                        t.id === tableId || t.name === tableId
                      )
                      return table?.name || tableId
                    })()}
                  </Typography>

                  {/* Booking Type */}
                  {booking.bookingType && (
                    <Chip
                      label={(() => {
                        const bookingType = contextBookingTypes.find(type => 
                          type.name === booking.bookingType || type.id === booking.bookingType
                        )
                        return bookingType?.name || booking.bookingType
                      })()}
                      size="small"
                      sx={{
                        height: 14,
                        fontSize: '0.55rem',
                        bgcolor: alpha(themeConfig.brandColors.offWhite, 0.2),
                        color: 'white',
                        '& .MuiChip-label': { px: 0.5 }
                      }}
                    />
                  )}

                  {/* Tracking Dropdown */}
                  <Chip
                    label={booking.tracking || 'Not Arrived'}
                    size="small"
                    onClick={(e) => handleTrackingMenuOpen(e, booking)}
                    sx={{
                      height: 14,
                      fontSize: '0.55rem',
                      bgcolor: alpha(themeConfig.brandColors.offWhite, 0.3),
                      color: 'white',
                      cursor: 'pointer',
                      '&:hover': { bgcolor: alpha(themeConfig.brandColors.offWhite, 0.4) },
                      '& .MuiChip-label': { px: 0.5 }
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          ))
        )}
      </Box>

      {/* Tracking Menu */}
      <Menu
        anchorEl={trackingMenuAnchor?.element}
        open={Boolean(trackingMenuAnchor)}
        onClose={handleTrackingMenuClose}
        PaperProps={{
          sx: { minWidth: 180 }
        }}
      >
        {TRACKING_OPTIONS.map((option) => (
          <MenuItem
            key={option}
            onClick={() => trackingMenuAnchor && handleTrackingChange(trackingMenuAnchor.booking, option)}
            selected={trackingMenuAnchor?.booking.tracking === option}
          >
            <ListItemIcon>
              <CircleIcon 
                sx={{ 
                  fontSize: 12, 
                  color: getTrackingColor(option)
                }} 
              />
            </ListItemIcon>
            <ListItemText 
              primary={option}
              primaryTypographyProps={{ fontSize: '0.875rem' }}
            />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  )
}

export default BookingList
