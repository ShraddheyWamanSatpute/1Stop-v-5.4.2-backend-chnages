"use client"

import type React from "react"
import { useState, useMemo } from "react"
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table as MuiTable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Alert,
  Tabs,
  Tab,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  useTheme,
  TextField,
  InputAdornment,
} from "@mui/material"
import {
  EventNote as BookingIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  AttachMoney as RevenueIcon,
  TableRestaurant as TableIcon,
  People as PeopleIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon,
  Print as PrintIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
} from "@mui/icons-material"
import DataHeader from "../reusable/DataHeader"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { format, subMonths, isWithinInterval, parseISO } from "date-fns"
import { useBookingsReportContext } from "../../../backend/context/AnalyticsContext"
import type { Booking, Table as BookingTable } from "../../../backend/interfaces/Bookings"
import DateRangeSelector from "../reusable/DateRangeSelector"

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`reports-tabpanel-${index}`}
      aria-labelledby={`reports-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

const BookingReports: React.FC = () => {
  const theme = useTheme()
  const bookingsContext = useBookingsReportContext()

  const [tabValue, setTabValue] = useState(0)
  const [dateRange, setDateRange] = useState({
    startDate: subMonths(new Date(), 1),
    endDate: new Date(),
  })
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [selectedTable, setSelectedTable] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [loading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Check permissions - simplified for context-only approach
  const canViewReports = true

  // Filter bookings based on criteria
  const filteredBookings = useMemo(() => {
    return bookingsContext.bookings.filter((booking: Booking) => {
      const bookingDate = parseISO(booking.date)
      const matchesDateRange = isWithinInterval(bookingDate, {
        start: dateRange.startDate,
        end: dateRange.endDate,
      })
      const matchesStatus = selectedStatus === "all" || booking.status === selectedStatus
      const matchesTable = selectedTable === "all" || booking.tableId === selectedTable
      const matchesSearch =
        searchTerm === "" ||
        (booking.customer?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (booking.customer?.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (booking.customer?.phone || "").includes(searchTerm)

      return matchesDateRange && matchesStatus && matchesTable && matchesSearch
    })
  }, [bookingsContext.bookings, dateRange, selectedStatus, selectedTable, searchTerm])

  // Calculate analytics data
  const analyticsData = useMemo(() => {
    const totalBookings = filteredBookings.length
    const confirmedBookings = filteredBookings.filter((b: Booking) => b.status === "confirmed").length
    const cancelledBookings = filteredBookings.filter((b: Booking) => b.status === "cancelled").length
    const pendingBookings = filteredBookings.filter((b: Booking) => b.status === "pending").length
    const completedBookings = filteredBookings.filter((b: Booking) => b.status === "completed").length

    // Revenue calculation (assuming each booking has a revenue field or we calculate it)
    const totalRevenue = filteredBookings
      .filter((b: Booking) => b.status === "completed")
      .reduce((sum: number, booking: Booking) => sum + (booking.totalAmount || 0), 0)

    // Average party size
    const avgPartySize =
      totalBookings > 0 ? filteredBookings.reduce((sum: number, booking: Booking) => sum + (booking.guestCount || 0), 0) / totalBookings : 0

    // Booking trends (daily)
    const bookingTrends = []
    const daysDiff = Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24))

    for (let i = 0; i <= daysDiff; i++) {
      const currentDate = new Date(dateRange.startDate)
      currentDate.setDate(currentDate.getDate() + i)

      const dayBookings = filteredBookings.filter((booking: Booking) => {
        const bookingDate = parseISO(booking.date)
        return format(bookingDate, "yyyy-MM-dd") === format(currentDate, "yyyy-MM-dd")
      })

      bookingTrends.push({
        date: format(currentDate, "MMM dd"),
        bookings: dayBookings.length,
        revenue: dayBookings.filter((b: { status: string }) => b.status === "completed").reduce((sum: any, b: { totalAmount: any }) => sum + (b.totalAmount || 0), 0),
      })
    }

    // Time slot analysis
    const timeSlotCounts = filteredBookings.reduce(
      (acc: { [x: string]: any }, booking: { startTime: string }) => {
        const hour = Number.parseInt(booking.startTime.split(":")[0])
        const timeSlot = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening"
        acc[timeSlot] = (acc[timeSlot] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    // Table utilization
    const tableUtilization = filteredBookings.reduce(
      (acc: Record<string, number>, booking: Booking) => {
        const table = bookingsContext.tables.find((t: { id: any }) => t.id === booking.tableId)
        const tableName = table ? `Table ${table.name}` : "Unknown Table"
        acc[tableName] = (acc[tableName] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    // Party size distribution
    const partySizeDistribution = filteredBookings.reduce(
      (acc: { [x: string]: any }, booking: { guestCount: number }) => {
        const guestCount = booking.guestCount || 0
        const sizeRange =
          guestCount <= 2
            ? "1-2"
            : guestCount <= 4
              ? "3-4"
              : guestCount <= 6
                ? "5-6"
                : guestCount <= 8
                  ? "7-8"
                  : "9+"
        acc[sizeRange] = (acc[sizeRange] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    // Cancellation reasons
    const cancellationReasons = filteredBookings
      .filter((b: Booking) => b.status === "cancelled")
      .reduce(
        (acc: Record<string, number>, booking: Booking) => {
          const reason = booking.notes || "No reason provided"
          acc[reason] = (acc[reason] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

    // Peak hours analysis
    const hourlyBookings = filteredBookings.reduce(
      (acc: Record<number, number>, booking: Booking) => {
        const hour = Number.parseInt(booking.startTime.split(":")[0])
        acc[hour] = (acc[hour] || 0) + 1
        return acc
      },
      {} as Record<number, number>,
    )

    const peakHours = Object.entries(hourlyBookings)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([hour, count]) => ({
        hour: `${hour}:00`,
        bookings: count,
      }))

    // Customer analysis
    const repeatCustomers = filteredBookings.reduce(
      (acc: Record<string, number>, booking: Booking) => {
        const customerEmail = booking.customer?.email || ""
        acc[customerEmail] = (acc[customerEmail] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const repeatCustomerCount = Object.values(repeatCustomers).filter((count: number) => count > 1).length

    return {
      totalBookings,
      confirmedBookings,
      cancelledBookings,
      pendingBookings,
      completedBookings,
      totalRevenue,
      avgPartySize,
      bookingTrends,
      timeSlotCounts,
      tableUtilization,
      partySizeDistribution,
      cancellationReasons,
      peakHours,
      repeatCustomerCount,
      cancellationRate: totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0,
      confirmationRate: totalBookings > 0 ? (confirmedBookings / totalBookings) * 100 : 0,
    }
  }, [filteredBookings, bookingsContext.tables, dateRange])

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleDateRangeChange = (start: Date, end: Date, _frequency: string) => {
    setDateRange({ startDate: start, endDate: end })
  }

  const handleExportData = () => {
    const csvData = [
      ["Booking Reports - " + format(new Date(), "yyyy-MM-dd")],
      [""],
      ["Summary"],
      ["Total Bookings", analyticsData.totalBookings],
      ["Confirmed Bookings", analyticsData.confirmedBookings],
      ["Cancelled Bookings", analyticsData.cancelledBookings],
      ["Total Revenue", `$${analyticsData.totalRevenue.toLocaleString()}`],
      ["Average Party Size", analyticsData.avgPartySize.toFixed(1)],
      ["Cancellation Rate", `${analyticsData.cancellationRate.toFixed(1)}%`],
      [""],
      ["Booking Details"],
      ["Date", "Time", "Customer", "Party Size", "Table", "Status", "Revenue"],
      ...filteredBookings.map((booking: Booking) => [
        booking.date,
        booking.startTime,
        booking.customer?.name || "Unknown",
        booking.guestCount || 0,
        bookingsContext.tables.find((t: { id: any }) => t.id === booking.tableId)?.name || "N/A",
        booking.status,
        booking.totalAmount || 0,
      ]),
    ]

    const csvContent = csvData.map((row) => (Array.isArray(row) ? row.join(",") : row)).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `booking-reports-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handlePrintReport = () => {
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Booking Reports - ${format(new Date(), "yyyy-MM-dd")}</title>
            <style>
              body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 20px; }
              h1, h2 { color: #222; }
              table { border-collapse: collapse; width: 100%; margin: 20px 0; }
              th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; }
              .summary { display: flex; flex-wrap: wrap; gap: 20px; margin: 20px 0; }
              .summary-item { border: 1px solid #ccc; padding: 15px; border-radius: 5px; }
            </style>
          </head>
          <body>
            <h1>Booking Reports</h1>
            <p>Generated on: ${format(new Date(), "MMMM dd, yyyy 'at' HH:mm")}</p>
            <p>Date Range: ${format(dateRange.startDate, "MMM dd, yyyy")} - ${format(dateRange.endDate, "MMM dd, yyyy")}</p>
            
            <h2>Summary</h2>
            <div class="summary">
              <div class="summary-item">
                <h3>Total Bookings</h3>
                <p>${analyticsData.totalBookings}</p>
              </div>
              <div class="summary-item">
                <h3>Confirmed</h3>
                <p>${analyticsData.confirmedBookings}</p>
              </div>
              <div class="summary-item">
                <h3>Cancelled</h3>
                <p>${analyticsData.cancelledBookings}</p>
              </div>
              <div class="summary-item">
                <h3>Total Revenue</h3>
                <p>$${analyticsData.totalRevenue.toLocaleString()}</p>
              </div>
            </div>

            <h2>Booking Details</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Customer</th>
                  <th>Party Size</th>
                  <th>Table</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${filteredBookings
                  .map(
                    (booking: Booking) => `
                  <tr>
                    <td>${format(parseISO(booking.date), "MMM dd, yyyy")}</td>
                    <td>${booking.startTime}</td>
                    <td>${booking.customer?.name || "Unknown"}</td>
                    <td>${booking.guestCount || 0}</td>
                    <td>${bookingsContext.tables.find((t: { id: any }) => t.id === booking.tableId)?.name || "N/A"}</td>
                    <td>${booking.status}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }


  // Chart colors
  const chartColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main,
  ]

  if (!canViewReports) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">You don't have permission to view booking reports.</Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 0 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <DataHeader
          currentDate={dateRange.startDate}
          onDateChange={(date) => setDateRange({ ...dateRange, startDate: date })}
          dateType="custom"
          onDateTypeChange={() => {}} // Reports use custom range only
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search reports..."
          filters={[]} // Reports use their own filter system below
          filtersExpanded={false}
          onFiltersToggle={() => {}}
          customStartDate={dateRange.startDate}
          customEndDate={dateRange.endDate}
          onCustomDateRangeChange={(start, end) => setDateRange({ startDate: start, endDate: end })}
          onExportPDF={handleExportData}
          additionalButtons={[
            {
              label: "Print",
              icon: <PrintIcon />,
              onClick: handlePrintReport,
              variant: "outlined",
            }
          ]}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <DateRangeSelector onDateRangeChange={handleDateRangeChange} />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={selectedStatus} label="Status" onChange={(e) => setSelectedStatus(e.target.value)}>
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="confirmed">Confirmed</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Table</InputLabel>
              <Select value={selectedTable} label="Table" onChange={(e) => setSelectedTable(e.target.value)}>
                <MenuItem value="all">All Tables</MenuItem>
                {bookingsContext.tables.map((table: BookingTable) => (
                  <MenuItem key={table.id} value={table.id}>
                    Table {table.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Key Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Total Bookings
                  </Typography>
                  <Typography variant="h4">{analyticsData.totalBookings}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                  <BookingIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Confirmed
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {analyticsData.confirmedBookings}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {analyticsData.confirmationRate.toFixed(1)}% rate
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.success.main }}>
                  <CheckCircleIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Revenue
                  </Typography>
                  <Typography variant="h4">${analyticsData.totalRevenue.toLocaleString()}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.info.main }}>
                  <RevenueIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Avg Party Size
                  </Typography>
                  <Typography variant="h4">{analyticsData.avgPartySize.toFixed(1)}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
                  <PeopleIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ width: "100%" }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="booking reports tabs">
          <Tab icon={<TrendingUpIcon />} label="Overview" />
          <Tab icon={<ScheduleIcon />} label="Time Analysis" />
          <Tab icon={<TableIcon />} label="Table Utilization" />
          <Tab icon={<PeopleIcon />} label="Customer Analysis" />
          <Tab icon={<BookingIcon />} label="Booking Details" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            {/* Booking Trends */}
            <Grid item xs={12} lg={8}>
              <Card>
                <CardHeader title="Booking Trends" />
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analyticsData.bookingTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="bookings" orientation="left" />
                      <YAxis yAxisId="revenue" orientation="right" />
                      <RechartsTooltip />
                      <Legend />
                      <Bar yAxisId="bookings" dataKey="bookings" fill={theme.palette.primary.main} name="Bookings" />
                      <Line
                        yAxisId="revenue"
                        type="monotone"
                        dataKey="revenue"
                        stroke={theme.palette.success.main}
                        strokeWidth={2}
                        name="Revenue ($)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Booking Status Distribution */}
            <Grid item xs={12} lg={4}>
              <Card>
                <CardHeader title="Booking Status" />
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Confirmed", value: analyticsData.confirmedBookings },
                          { name: "Pending", value: analyticsData.pendingBookings },
                          { name: "Completed", value: analyticsData.completedBookings },
                          { name: "Cancelled", value: analyticsData.cancelledBookings },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill={theme.palette.primary.main}
                        dataKey="value"
                      >
                        <Cell fill={theme.palette.success.main} />
                        <Cell fill={theme.palette.warning.main} />
                        <Cell fill={theme.palette.info.main} />
                        <Cell fill={theme.palette.error.main} />
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Party Size Distribution */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Party Size Distribution" />
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={Object.entries(analyticsData.partySizeDistribution).map(([size, count]) => ({
                        size,
                        bookings: count,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="size" />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar dataKey="bookings" fill={theme.palette.secondary.main} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Peak Hours */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Peak Hours" />
                <CardContent>
                  <List>
                    {analyticsData.peakHours.map((peak, index) => (
                      <ListItem key={peak.hour}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: chartColors[index % chartColors.length] }}>
                            <TimeIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={`${peak.hour} - ${Number.parseInt(peak.hour.split(":")[0]) + 1}:00`}
                          secondary={`${peak.bookings} bookings`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            {/* Time Slot Analysis */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Bookings by Time Slot" />
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={Object.entries(analyticsData.timeSlotCounts).map(([slot, count]) => ({
                          name: slot,
                          value: count,
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill={theme.palette.primary.main}
                        dataKey="value"
                      >
                        {Object.keys(analyticsData.timeSlotCounts).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Hourly Booking Distribution */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Hourly Distribution" />
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={Array.from({ length: 24 }, (_, hour) => ({
                        hour: `${hour}:00`,
                        bookings: filteredBookings.filter((b: { startTime: string }) => Number.parseInt(b.startTime.split(":")[0]) === hour).length,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar dataKey="bookings" fill={theme.palette.primary.main} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            {/* Table Utilization */}
            <Grid item xs={12}>
              <Card>
                <CardHeader title="Table Utilization" />
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={Object.entries(analyticsData.tableUtilization).map(([table, count]) => ({
                        table,
                        bookings: count,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="table" />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar dataKey="bookings" fill={theme.palette.info.main} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Table Performance */}
            <Grid item xs={12}>
              <Card>
                <CardHeader title="Table Performance Details" />
                <CardContent>
                  <TableContainer>
                    <MuiTable>
                      <TableHead>
                        <TableRow>
                          <TableCell>Table</TableCell>
                          <TableCell>Total Bookings</TableCell>
                          <TableCell>Capacity</TableCell>
                          <TableCell>Utilization Rate</TableCell>
                          <TableCell>Revenue</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {bookingsContext.tables.map((table: BookingTable) => {
                          const tableBookings = filteredBookings.filter((b: Booking) => b.tableId === table.id)
                          const tableRevenue = tableBookings
                            .filter((b: { status: string }) => b.status === "completed")
                            .reduce((sum: number, b: Booking) => sum + (b.totalAmount || 0), 0)
                          const utilizationRate =
                            tableBookings.length > 0 ? (tableBookings.length / filteredBookings.length) * 100 : 0

                          return (
                            <TableRow key={table.id}>
                              <TableCell>
                                <Box sx={{ display: "flex", alignItems: "center" }}>
                                  <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                                    <TableIcon />
                                  </Avatar>
                                  Table {table.name}
                                </Box>
                              </TableCell>
                              <TableCell>{tableBookings.length}</TableCell>
                              <TableCell>{table.capacity} seats</TableCell>
                              <TableCell>
                                <Box sx={{ display: "flex", alignItems: "center" }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={Math.min(utilizationRate, 100)}
                                    sx={{ width: 100, mr: 1 }}
                                  />
                                  {utilizationRate.toFixed(1)}%
                                </Box>
                              </TableCell>
                              <TableCell>${tableRevenue.toLocaleString()}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </MuiTable>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            {/* Customer Metrics */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardHeader title="Customer Metrics" />
                <CardContent>
                  <List>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                          <PeopleIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary="Total Customers"
                        secondary={new Set(filteredBookings.map((b: Booking) => b.customer?.email || "")).size}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: theme.palette.success.main }}>
                          <TrendingUpIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText primary="Repeat Customers" secondary={analyticsData.repeatCustomerCount} />
                    </ListItem>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: theme.palette.warning.main }}>
                          <CancelIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary="Cancellation Rate"
                        secondary={`${analyticsData.cancellationRate.toFixed(1)}%`}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Cancellation Reasons */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardHeader title="Cancellation Reasons" />
                <CardContent>
                  {Object.keys(analyticsData.cancellationReasons).length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart
                        data={Object.entries(analyticsData.cancellationReasons).map(([reason, count]) => ({
                          reason: reason.length > 20 ? reason.substring(0, 20) + "..." : reason,
                          count,
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="reason" />
                        <YAxis />
                        <RechartsTooltip />
                        <Bar dataKey="count" fill={theme.palette.error.main} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                      No cancellations in the selected period
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <Card>
            <CardHeader title="Booking Details" />
            <CardContent>
              <TableContainer>
                                    <MuiTable>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Time</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Contact</TableCell>
                      <TableCell>Party Size</TableCell>
                      <TableCell>Table</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Revenue</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredBookings.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((booking: Booking) => (
                      <TableRow key={booking.id}>
                        <TableCell>{format(parseISO(booking.date), "MMM dd, yyyy")}</TableCell>
                        <TableCell>{booking.startTime}</TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                              <PersonIcon />
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={500}>
                                {booking.customer?.name || "Unknown"}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {booking.customer?.email || ""}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>{booking.customer?.phone || ""}</TableCell>
                        <TableCell>
                          <Chip
                            label={`${booking.guestCount || 0} ${(booking.guestCount || 0) === 1 ? "person" : "people"}`}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          {bookingsContext.tables.find((t: { id: any }) => t.id === booking.tableId)?.name || "N/A"}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={booking.status}
                            size="small"
                            color={
                              booking.status === "confirmed"
                                ? "success"
                                : booking.status === "completed"
                                  ? "info"
                                  : booking.status === "cancelled"
                                    ? "error"
                                    : "warning"
                            }
                          />
                        </TableCell>
                        <TableCell>{booking.totalAmount ? `$${booking.totalAmount.toLocaleString()}` : "N/A"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </MuiTable>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={filteredBookings.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(Number.parseInt(e.target.value, 10))
                  setPage(0)
                }}
              />
            </CardContent>
          </Card>
        </TabPanel>
      </Paper>
    </Box>
  )
}

export default BookingReports
