"use client"

import { themeConfig } from "../../../theme/AppTheme";
import { alpha } from "@mui/material/styles";
import React, { useState, useEffect } from "react"
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Avatar,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  FormControlLabel,
  Snackbar,
  ListItemAvatar,
} from "@mui/material"
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Event as EventIcon,
  People as PeopleIcon,
  LocationOn as LocationOnIcon,
  Schedule as ScheduleIcon,
  Celebration as CelebrationIcon,
  Business as BusinessIcon,
  Notifications as NotificationsIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HelpOutline as HelpOutlineIcon,
} from "@mui/icons-material"
import { useHR } from "../../../backend/context/HRContext"
// Company state is now handled through HRContext
import type { CompanyEvent, EventRSVP } from "../../../backend/interfaces/HRs"
// Functions now accessed through HRContext
import DataHeader from "../reusable/DataHeader"

import type { TabPanelProps } from "../../../backend/interfaces/HRs"

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`events-tabpanel-${index}`}
      aria-labelledby={`events-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

const EventsManagement: React.FC = () => {
  const {
    state: hrState,
    refreshEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    fetchEventRSVPs,
    createEventRSVP,
    updateEventRSVP,
  } = useHR()
  // Company state is now handled through HRContext

  const [tabValue, setTabValue] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null)

  // Events data - use local state with HR context integration
  const [events, setEvents] = useState<CompanyEvent[]>(hrState.events || [])
  const [rsvps, setRSVPs] = useState<EventRSVP[]>([])
  const [filteredEvents, setFilteredEvents] = useState<CompanyEvent[]>([])

  // Dialog states
  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CompanyEvent | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [dateFilter, setDateFilter] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<string>("startDate")
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>("asc")

  // DataHeader configuration
  const filters = [
    {
      label: "Status",
      options: [
        { id: "draft", name: "Draft", color: "#9e9e9e" },
        { id: "published", name: "Published", color: "#4caf50" },
        { id: "completed", name: "Completed", color: "#ff9800" },
        { id: "cancelled", name: "Cancelled", color: "#f44336" },
      ],
      selectedValues: statusFilter,
      onSelectionChange: setStatusFilter,
    },
    {
      label: "Type",
      options: [
        { id: "meeting", name: "Meeting", color: "#2196f3" },
        { id: "training", name: "Training", color: themeConfig.colors.primary.light },
        { id: "social", name: "Social", color: "#4caf50" },
        { id: "company_wide", name: "Company Wide", color: "#ff9800" },
        { id: "department", name: "Department", color: "#795548" },
        { id: "celebration", name: "Celebration", color: "#9c27b0" },
      ],
      selectedValues: typeFilter,
      onSelectionChange: setTypeFilter,
    },
    {
      label: "Date Range",
      options: [
        { id: "upcoming", name: "Upcoming", color: "#4caf50" },
        { id: "this_week", name: "This Week", color: "#2196f3" },
        { id: "this_month", name: "This Month", color: "#ff9800" },
        { id: "past", name: "Past", color: "#9e9e9e" },
      ],
      selectedValues: dateFilter,
      onSelectionChange: setDateFilter,
    },
  ]

  const sortOptions = [
    { value: "title", label: "Title" },
    { value: "startDate", label: "Start Date" },
    { value: "endDate", label: "End Date" },
    { value: "type", label: "Type" },
    { value: "status", label: "Status" },
  ]

  // DataHeader handlers
  const handleSortChange = (value: string, direction: "asc" | "desc") => {
    setSortBy(value)
    setSortDirection(direction)
  }

  const handleCreateNew = () => {
    setSelectedEvent(null)
    setEventDialogOpen(true)
  }

  const getEventRsvpCount = (eventId: string) => rsvps.filter((rsvp) => rsvp.eventId === eventId).length


  const handleExportCSV = () => {
    const headers = [
      "Title",
      "Description",
      "Type",
      "Status",
      "Start Date",
      "End Date",
      "Location",
      "Max Attendees",
      "Current RSVPs",
      "Created Date",
    ]
    const csvContent = [
      headers.join(","),
      ...filteredEvents.map((event) =>
        [
          `"${event.title}"`,
          `"${event.description.replace(/"/g, '""')}"`,
          event.type || "",
          event.status || "",
          event.startDate ? new Date(event.startDate).toISOString().split('T')[0] : "",
          event.endDate ? new Date(event.endDate).toISOString().split('T')[0] : "",
          `"${event.location || ""}"`,
          event.maxAttendees?.toString() || "",
          getEventRsvpCount(event.id).toString(),
          event.createdAt ? new Date(event.createdAt).toISOString().split('T')[0] : "",
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `company_events_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  useEffect(() => {
    loadEventsData()
  }, []) // Company state handled internally

  useEffect(() => {
    setEvents(hrState.events || [])
  }, [hrState.events])

  useEffect(() => {
    const loadRsvps = async () => {
      if (!events.length) {
        setRSVPs([])
        return
      }

      try {
        const allRsvps = await Promise.all(events.map((event) => fetchEventRSVPs(event.id)))
        const deduped = allRsvps
          .flat()
          .filter((rsvp, index, array) => array.findIndex((candidate) => candidate.id === rsvp.id) === index)
        setRSVPs(deduped)
      } catch (err: any) {
        console.error("Error loading event RSVPs:", err)
        setError(err.message || "Failed to load event RSVPs")
      }
    }

    loadRsvps()
  }, [events, fetchEventRSVPs])

  useEffect(() => {
    applyFilters()
  }, [events, searchTerm, statusFilter, typeFilter, dateFilter, sortBy, sortDirection])

  const loadEventsData = async () => {
    setLoading(true)
    try {
      await refreshEvents()
      setError(null)
    } catch (err: any) {
      console.error("Error loading events data:", err)
      setError(err.message || "Failed to load events data")
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...events]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((event) =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter.length > 0) {
      filtered = filtered.filter((event) => statusFilter.includes(event.status))
    }

    // Type filter
    if (typeFilter.length > 0) {
      filtered = filtered.filter((event) => typeFilter.includes(event.type))
    }

    // Date filter
    if (dateFilter.length > 0) {
      const now = Date.now()
      const oneWeek = 7 * 24 * 60 * 60 * 1000
      const oneMonth = 30 * 24 * 60 * 60 * 1000

      filtered = filtered.filter((event) => {
        return dateFilter.some((filter) => {
          switch (filter) {
            case "upcoming":
              return event.startDate > now
            case "past":
              return event.endDate < now
            case "this_week":
              return event.startDate >= now && event.startDate <= now + oneWeek
            case "this_month":
              return event.startDate >= now && event.startDate <= now + oneMonth
            default:
              return true
          }
        })
      })
    }

    // Sort filtered events
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof CompanyEvent]
      let bValue: any = b[sortBy as keyof CompanyEvent]
      
      if (sortBy === "startDate" || sortBy === "endDate") {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }
      
      if (aValue < bValue) {
        return sortDirection === "asc" ? -1 : 1
      }
      if (aValue > bValue) {
        return sortDirection === "asc" ? 1 : -1
      }
      return 0
    })

    setFilteredEvents(filtered)
  }


  const handleCreateEvent = () => {
    setSelectedEvent(null)
    setEventDialogOpen(true)
  }

  const handleEditEvent = (event: CompanyEvent) => {
    setSelectedEvent(event)
    setEventDialogOpen(true)
  }

  const handleDeleteEvent = async (eventId: string) => {
    setLoading(true)
    try {
      await deleteEvent(eventId)
      setNotification({ message: "Event deleted successfully", type: "success" })
      await loadEventsData()
      setError(null)
    } catch (err: any) {
      console.error("Error deleting event:", err)
      setError(err.message || "Failed to delete event")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveEvent = async (eventData: Partial<CompanyEvent>) => {
    setLoading(true)
    try {
      if (selectedEvent) {
        await updateEvent(selectedEvent.id, eventData)
        setNotification({ message: "Event updated successfully", type: "success" })
      } else {
        await createEvent({
          ...eventData,
          attendees: [],
          tags: [],
        })
        setNotification({ message: "Event created successfully", type: "success" })
      }

      await loadEventsData()
      setEventDialogOpen(false)
      setError(null)
    } catch (err: any) {
      console.error("Error saving event:", err)
      setError(err.message || "Failed to save event")
    } finally {
      setLoading(false)
    }
  }

  const handleRSVP = async (eventId: string, status: "attending" | "not_attending" | "maybe") => {
    setLoading(true)
    try {
      const currentEmployee = hrState.employees[0]
      if (!currentEmployee) {
        setError("No employee found")
        return
      }

      const existingRSVP = rsvps.find((rsvp) => rsvp.eventId === eventId && rsvp.employeeId === currentEmployee.id)

      if (existingRSVP) {
        await updateEventRSVP(existingRSVP.id, {
          ...existingRSVP,
          status,
          responseDate: Date.now(),
        })
      } else {
        await createEventRSVP({
          eventId,
          employeeId: currentEmployee.id,
          employeeName: `${currentEmployee.firstName} ${currentEmployee.lastName}`.trim() || "Employee",
          status,
          responseDate: Date.now(),
        })
      }

      setNotification({ message: "RSVP updated successfully", type: "success" })
      await loadEventsData()
      setError(null)
    } catch (err: any) {
      console.error("Error updating RSVP:", err)
      setError(err.message || "Failed to update RSVP")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString()
  }

  const formatDateTime = (timestamp: number, time: string) => {
    const date = new Date(timestamp).toLocaleDateString()
    return `${date} at ${time}`
  }

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case "meeting":
        return <BusinessIcon />
      case "training":
        return <ScheduleIcon />
      case "social":
        return <PeopleIcon />
      case "celebration":
        return <CelebrationIcon />
      default:
        return <EventIcon />
    }
  }

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "meeting":
        return "primary"
      case "training":
        return "info"
      case "social":
        return "success"
      case "celebration":
        return "secondary"
      case "company_wide":
        return "warning"
      default:
        return "default"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "success"
      case "draft":
        return "warning"
      case "cancelled":
        return "error"
      case "completed":
        return "info"
      default:
        return "default"
    }
  }

  const getRSVPIcon = (status: string) => {
    switch (status) {
      case "attending":
        return <CheckCircleIcon color="success" />
      case "not_attending":
        return <CancelIcon color="error" />
      case "maybe":
        return <HelpOutlineIcon color="warning" />
      default:
        return <HelpOutlineIcon />
    }
  }

  const capitalize = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())

  return (
    <Box sx={{ p: 0 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* DataHeader with tab switches - Updated v2 */}
      <DataHeader
        showDateControls={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search events..."
        filters={filters}
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded(!filtersExpanded)}
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onCreateNew={handleCreateNew}
        createButtonLabel="Create Event"
        onExportCSV={handleExportCSV}
        additionalControls={
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 0.5,
            flexWrap: 'nowrap',
            minWidth: 0
          }}>
            <Button
              variant={tabValue === 0 ? "contained" : "outlined"}
              size="small"
              onClick={() => setTabValue(0)}
              sx={
                tabValue === 0
                  ? { 
                      bgcolor: "white", 
                      color: themeConfig.brandColors.navy, 
                      "&:hover": { bgcolor: alpha(themeConfig.brandColors.navy, 0.04) },
                      whiteSpace: "nowrap"
                    }
                  : { 
                      color: "white", 
                      borderColor: alpha(themeConfig.brandColors.offWhite, 0.5), 
                      "&:hover": { borderColor: "white", bgcolor: alpha(themeConfig.brandColors.offWhite, 0.1) },
                      whiteSpace: "nowrap"
                    }
              }
            >
              All Events
            </Button>
            <Button
              variant={tabValue === 1 ? "contained" : "outlined"}
              size="small"
              onClick={() => setTabValue(1)}
              sx={
                tabValue === 1
                  ? { 
                      bgcolor: "white", 
                      color: themeConfig.brandColors.navy, 
                      "&:hover": { bgcolor: alpha(themeConfig.brandColors.navy, 0.04) },
                      whiteSpace: "nowrap"
                    }
                  : { 
                      color: "white", 
                      borderColor: alpha(themeConfig.brandColors.offWhite, 0.5), 
                      "&:hover": { borderColor: "white", bgcolor: alpha(themeConfig.brandColors.offWhite, 0.1) },
                      whiteSpace: "nowrap"
                    }
              }
            >
              Calendar
            </Button>
            <Button
              variant={tabValue === 2 ? "contained" : "outlined"}
              size="small"
              onClick={() => setTabValue(2)}
              sx={
                tabValue === 2
                  ? { 
                      bgcolor: "white", 
                      color: themeConfig.brandColors.navy, 
                      "&:hover": { bgcolor: alpha(themeConfig.brandColors.navy, 0.04) },
                      whiteSpace: "nowrap"
                    }
                  : { 
                      color: "white", 
                      borderColor: alpha(themeConfig.brandColors.offWhite, 0.5), 
                      "&:hover": { borderColor: "white", bgcolor: alpha(themeConfig.brandColors.offWhite, 0.1) },
                      whiteSpace: "nowrap"
                    }
              }
            >
              RSVPs
            </Button>
            <Button
              variant={tabValue === 3 ? "contained" : "outlined"}
              size="small"
              onClick={() => setTabValue(3)}
              sx={
                tabValue === 3
                  ? { 
                      bgcolor: "white", 
                      color: themeConfig.brandColors.navy, 
                      "&:hover": { bgcolor: alpha(themeConfig.brandColors.navy, 0.04) },
                      whiteSpace: "nowrap"
                    }
                  : { 
                      color: "white", 
                      borderColor: alpha(themeConfig.brandColors.offWhite, 0.5), 
                      "&:hover": { borderColor: "white", bgcolor: alpha(themeConfig.brandColors.offWhite, 0.1) },
                      whiteSpace: "nowrap"
                    }
              }
            >
              Analytics
            </Button>
          </Box>
        }
      />

      {/* All Events Tab */}
      <TabPanel value={tabValue} index={0}>

        {/* Events List */}
        <Grid container spacing={3}>
          {filteredEvents.map((event) => (
            <Grid item xs={12} md={6} key={event.id}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Avatar sx={{ bgcolor: "primary.light", mr: 2 }}>{getEventTypeIcon(event.type)}</Avatar>
                      <Box>
                        <Typography variant="h6">{event.title}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDateTime(event.startDate, event.startTime)}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Chip
                        label={capitalize(event.type)}
                        size="small"
                        color={getEventTypeColor(event.type) as any}
                        variant="outlined"
                      />
                      <Chip label={capitalize(event.status)} size="small" color={getStatusColor(event.status) as any} />
                    </Box>
                  </Box>

                  <Typography variant="body2" paragraph>
                    {event.description}
                  </Typography>

                  <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                    <LocationOnIcon fontSize="small" sx={{ mr: 1, color: "text.secondary" }} />
                    <Typography variant="body2" color="text.secondary">
                      {event.isVirtual ? "Virtual Event" : event.location}
                    </Typography>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <PeopleIcon fontSize="small" sx={{ mr: 1, color: "text.secondary" }} />
                    <Typography variant="body2" color="text.secondary">
                      {getEventRsvpCount(event.id)} RSVP{getEventRsvpCount(event.id) === 1 ? "" : "s"}
                      {event.maxAttendees && ` / ${event.maxAttendees} max`}
                    </Typography>
                  </Box>

                  {event.requiresRSVP && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        RSVP Status:
                      </Typography>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          onClick={() => handleRSVP(event.id, "attending")}
                        >
                          Attending
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="warning"
                          onClick={() => handleRSVP(event.id, "maybe")}
                        >
                          Maybe
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => handleRSVP(event.id, "not_attending")}
                        >
                          Not Attending
                        </Button>
                      </Box>
                    </Box>
                  )}
                </CardContent>
                <Divider />
                <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}>
                  <Button size="small" startIcon={<EditIcon />} onClick={() => handleEditEvent(event)} sx={{ mr: 1 }}>
                    Edit
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDeleteEvent(event.id)}
                  >
                    Delete
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))}

          {filteredEvents.length === 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: "center" }}>
                <EventIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Events Found
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {events.length === 0
                    ? "Create your first company event to get started."
                    : "No events match your current filters."}
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateEvent}>
                  Create First Event
                </Button>
              </Paper>
            </Grid>
          )}
        </Grid>
      </TabPanel>

      {/* Calendar View Tab */}
      <TabPanel value={tabValue} index={1}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Upcoming Events Calendar
          </Typography>

          <Grid container spacing={3}>
            {events
              .filter((event) => event.startDate > Date.now())
              .sort((a, b) => a.startDate - b.startDate)
              .map((event) => (
                <Grid item xs={12} md={6} key={event.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                        <Avatar sx={{ bgcolor: "primary.light", mr: 2 }}>{getEventTypeIcon(event.type)}</Avatar>
                        <Box>
                          <Typography variant="h6">{event.title}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {formatDateTime(event.startDate, event.startTime)} - {event.endTime}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="body2" paragraph>
                        {event.description}
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                        <LocationOnIcon fontSize="small" sx={{ mr: 1, color: "text.secondary" }} />
                        <Typography variant="body2" color="text.secondary">
                          {event.isVirtual ? "Virtual Event" : event.location}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
          </Grid>
        </Paper>
      </TabPanel>

      {/* RSVPs Tab */}
      <TabPanel value={tabValue} index={2}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Event RSVPs
          </Typography>
          {rsvps.length > 0 ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Event</TableCell>
                    <TableCell>Employee</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Response Date</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rsvps.map((rsvp) => {
                    const event = events.find((e) => e.id === rsvp.eventId)
                    return (
                      <TableRow key={rsvp.id} hover>
                        <TableCell>{event?.title || "Unknown Event"}</TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <ListItemAvatar sx={{ minWidth: 40 }}>{getRSVPIcon(rsvp.status)}</ListItemAvatar>
                            {rsvp.employeeName}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={capitalize(rsvp.status)}
                            size="small"
                            color={
                              rsvp.status === "attending" ? "success" : rsvp.status === "maybe" ? "warning" : "error"
                            }
                          />
                        </TableCell>
                        <TableCell>{formatDate(rsvp.responseDate)}</TableCell>
                        <TableCell>{rsvp.notes || "No notes"}</TableCell>
                        <TableCell align="right">
                          <IconButton size="small">
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <NotificationsIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                No RSVPs recorded yet.
              </Typography>
            </Box>
          )}
        </Paper>
      </TabPanel>

      {/* Analytics Tab */}
      <TabPanel value={tabValue} index={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Total Events
                </Typography>
                <Typography variant="h3" color="primary">
                  {events.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Upcoming Events
                </Typography>
                <Typography variant="h3" color="success.main">
                  {events.filter((e) => e.startDate > Date.now()).length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Total RSVPs
                </Typography>
                <Typography variant="h3" color="info.main">
                  {rsvps.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Attendance Rate
                </Typography>
                <Typography variant="h3" color="warning.main">
                  {rsvps.length > 0
                    ? Math.round((rsvps.filter((r) => r.status === "attending").length / rsvps.length) * 100)
                    : 0}
                  %
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Event Types Distribution
              </Typography>
              <Grid container spacing={2}>
                {Object.entries(
                  events.reduce((acc: any, event) => {
                    acc[event.type] = (acc[event.type] || 0) + 1
                    return acc
                  }, {}),
                ).map(([type, count]) => (
                  <Grid item xs={12} sm={6} md={4} key={type}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        p: 2,
                        border: 1,
                        borderColor: "divider",
                        borderRadius: 1,
                      }}
                    >
                      <Avatar sx={{ bgcolor: "primary.light", mr: 2 }}>{getEventTypeIcon(type)}</Avatar>
                      <Box>
                        <Typography variant="body1">{capitalize(type)}</Typography>
                        <Typography variant="h6" color="primary">
                          {count as number}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Event Dialog */}
      <Dialog open={eventDialogOpen} onClose={() => setEventDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">{selectedEvent ? "Edit Event" : "Create New Event"}</Typography>
            <IconButton onClick={() => setEventDialogOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <EventForm event={selectedEvent} onSave={handleSaveEvent} onCancel={() => setEventDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={() => setNotification(null)} severity={notification?.type} sx={{ width: "100%" }}>
          {notification?.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

// Event Form Component
const EventForm: React.FC<{
  event?: CompanyEvent | null
  onSave: (data: any) => void
  onCancel: () => void
}> = ({ event, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: event?.title || "",
    description: event?.description || "",
    type: event?.type || "meeting",
    startDate: event?.startDate ? new Date(event.startDate).toISOString().split("T")[0] : "",
    endDate: event?.endDate ? new Date(event.endDate).toISOString().split("T")[0] : "",
    startTime: event?.startTime || "09:00",
    endTime: event?.endTime || "10:00",
    location: event?.location || "",
    isVirtual: event?.isVirtual || false,
    virtualLink: event?.virtualLink || "",
    organizer: event?.organizer || "",
    maxAttendees: event?.maxAttendees || "",
    isPublic: event?.isPublic || true,
    requiresRSVP: event?.requiresRSVP || false,
    status: event?.status || "draft",
  })

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = () => {
    const eventData = {
      ...formData,
      startDate: new Date(formData.startDate).getTime(),
      endDate: new Date(formData.endDate).getTime(),
      maxAttendees: formData.maxAttendees ? Number(formData.maxAttendees) : undefined,
    }
    onSave(eventData)
  }

  return (
    <Grid container spacing={2} sx={{ mt: 0.5 }}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Event Title"
          value={formData.title}
          onChange={(e) => handleChange("title", e.target.value)}
          required
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Description"
          multiline
          rows={3}
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Event Type</InputLabel>
          <Select label="Event Type" value={formData.type} onChange={(e) => handleChange("type", e.target.value)}>
            <MenuItem value="meeting">Meeting</MenuItem>
            <MenuItem value="training">Training</MenuItem>
            <MenuItem value="social">Social</MenuItem>
            <MenuItem value="company_wide">Company Wide</MenuItem>
            <MenuItem value="department">Department</MenuItem>
            <MenuItem value="celebration">Celebration</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Status</InputLabel>
          <Select label="Status" value={formData.status} onChange={(e) => handleChange("status", e.target.value)}>
            <MenuItem value="draft">Draft</MenuItem>
            <MenuItem value="published">Published</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Start Date"
          type="date"
          value={formData.startDate}
          onChange={(e) => handleChange("startDate", e.target.value)}
          InputLabelProps={{ shrink: true }}
          required
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="End Date"
          type="date"
          value={formData.endDate}
          onChange={(e) => handleChange("endDate", e.target.value)}
          InputLabelProps={{ shrink: true }}
          required
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Start Time"
          type="time"
          value={formData.startTime}
          onChange={(e) => handleChange("startTime", e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="End Time"
          type="time"
          value={formData.endTime}
          onChange={(e) => handleChange("endTime", e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Checkbox checked={formData.isVirtual} onChange={(e) => handleChange("isVirtual", e.target.checked)} />
          }
          label="Virtual Event"
        />
      </Grid>
      {formData.isVirtual ? (
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Virtual Meeting Link"
            value={formData.virtualLink}
            onChange={(e) => handleChange("virtualLink", e.target.value)}
            placeholder="https://zoom.us/j/..."
          />
        </Grid>
      ) : (
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Location"
            value={formData.location}
            onChange={(e) => handleChange("location", e.target.value)}
            placeholder="Conference Room A, Main Office"
          />
        </Grid>
      )}
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Organizer"
          value={formData.organizer}
          onChange={(e) => handleChange("organizer", e.target.value)}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Max Attendees (Optional)"
          type="number"
          value={formData.maxAttendees}
          onChange={(e) => handleChange("maxAttendees", e.target.value)}
        />
      </Grid>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Checkbox
              checked={formData.requiresRSVP}
              onChange={(e) => handleChange("requiresRSVP", e.target.checked)}
            />
          }
          label="Requires RSVP"
        />
      </Grid>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Checkbox checked={formData.isPublic} onChange={(e) => handleChange("isPublic", e.target.checked)} />
          }
          label="Public Event (visible to all employees)"
        />
      </Grid>
      <Grid item xs={12}>
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 2 }}>
          <Button variant="outlined" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSubmit}>
            {event ? "Update Event" : "Create Event"}
          </Button>
        </Box>
      </Grid>
    </Grid>
  )
}

export default EventsManagement
