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
  Button,
  Chip,
  Table,
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
} from "@mui/material"
import {
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  AttachMoney as AttachMoneyIcon,
  Star as PerformanceIcon,
  CheckCircle as CheckCircleIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
  Assignment as AssignmentIcon,
} from "@mui/icons-material"
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
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns"
import { useHR } from "../../../backend/context/HRContext"
import StatsSection from "../reusable/StatsSection"
// Company state is now handled through HRContext
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
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

const HRAnalytics: React.FC = () => {
  const theme = useTheme()
  const { state: hrState, hasPermission } = useHR()
  // Company state is now handled through HRContext

  const [tabValue, setTabValue] = useState(0)
  const [dateRange, setDateRange] = useState({
    startDate: subMonths(new Date(), 3),
    endDate: new Date(),
  })
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all")
  const [selectedRole, setSelectedRole] = useState<string>("all")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Check permissions
  const canViewAnalytics = hasPermission("hr", "analytics", "view")

  // Filter data based on date range and selections
  const filteredEmployees = useMemo(() => {
    return hrState.employees.filter((employee) => {
      const matchesDepartment = selectedDepartment === "all" || employee.department === selectedDepartment
      const matchesRole = selectedRole === "all" || employee.role?.toString() === selectedRole
      const withinDateRange = isWithinInterval(new Date(employee.hireDate), {
        start: dateRange.startDate,
        end: dateRange.endDate,
      })
      return matchesDepartment && matchesRole && withinDateRange
    })
  }, [hrState.employees, selectedDepartment, selectedRole, dateRange])

  // Mock time off requests data since it doesn't exist in HRState
  const mockTimeOffRequests = useMemo(() => {
    return hrState.employees.map((employee, index) => ({
      id: `timeoff-${index}`,
      employeeId: employee.id,
      type: ["vacation", "sick", "personal"][index % 3],
      startDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)).toISOString(),
      endDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)).toISOString(),
      status: ["approved", "pending", "rejected"][index % 3],
    }))
  }, [hrState.employees])

  const filteredTimeOff = useMemo(() => {
    return mockTimeOffRequests.filter((request) => {
      const requestDate = new Date(request.startDate)
      return isWithinInterval(requestDate, {
        start: dateRange.startDate,
        end: dateRange.endDate,
      })
    })
  }, [mockTimeOffRequests, dateRange])

  // Mock performance reviews data
  const mockPerformanceReviews = useMemo(() => {
    return hrState.employees.map((employee, index) => ({
      id: `review-${index}`,
      employeeId: employee.id,
      reviewDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)).toISOString(),
      overallScore: 2 + Math.random() * 3, // Score between 2-5
    }))
  }, [hrState.employees])

  const filteredPerformanceReviews = useMemo(() => {
    return mockPerformanceReviews.filter((review) => {
      const reviewDate = new Date(review.reviewDate)
      return isWithinInterval(reviewDate, {
        start: dateRange.startDate,
        end: dateRange.endDate,
      })
    })
  }, [mockPerformanceReviews, dateRange])

  // Calculate analytics data
  const analyticsData = useMemo(() => {
    const totalEmployees = filteredEmployees.length
    const activeEmployees = filteredEmployees.filter((emp) => emp.status === "active").length
    const inactiveEmployees = totalEmployees - activeEmployees

    // Department distribution
    const departmentCounts = filteredEmployees.reduce(
      (acc, emp) => {
        const dept = emp.department || "Unknown"
        acc[dept] = (acc[dept] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    // Role distribution (get roles from users context)
    const roleCounts = filteredEmployees.reduce(
      (acc, emp) => {
        // Get role from user data via userId, fallback to position
        const role = emp.position || "Unknown"
        acc[role] = (acc[role] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    // Hiring trends (monthly)
    const hiringTrends = []
    for (let i = 11; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(new Date(), i))
      const monthEnd = endOfMonth(subMonths(new Date(), i))
      const hiredInMonth = hrState.employees.filter((emp) => {
        const hireDate = new Date(emp.hireDate)
        return isWithinInterval(hireDate, { start: monthStart, end: monthEnd })
      }).length

      hiringTrends.push({
        month: format(monthStart, "MMM yyyy"),
        hires: hiredInMonth,
      })
    }

    // Time off statistics
    const totalTimeOffDays = filteredTimeOff.reduce((sum, request) => {
      if (request.status === "approved") {
        const start = new Date(request.startDate)
        const end = new Date(request.endDate)
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
        return sum + days
      }
      return sum
    }, 0)

    const timeOffByType = filteredTimeOff.reduce(
      (acc, request) => {
        if (request.status === "approved") {
          acc[request.type] = (acc[request.type] || 0) + 1
        }
        return acc
      },
      {} as Record<string, number>,
    )

    // Performance statistics
    const avgPerformanceScore =
      filteredPerformanceReviews.length > 0
        ? filteredPerformanceReviews.reduce((sum, review) => sum + review.overallScore, 0) /
          filteredPerformanceReviews.length
        : 0

    const performanceDistribution = filteredPerformanceReviews.reduce(
      (acc, review) => {
        const rating =
          review.overallScore >= 4.5
            ? "Excellent"
            : review.overallScore >= 3.5
              ? "Good"
              : review.overallScore >= 2.5
                ? "Average"
                : "Needs Improvement"
        acc[rating] = (acc[rating] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    // Salary statistics
    const totalPayroll = filteredEmployees.reduce((sum, emp) => sum + (emp.salary || 0), 0)
    const avgSalary = totalEmployees > 0 ? totalPayroll / totalEmployees : 0

    const salaryByDepartment = filteredEmployees.reduce(
      (acc, emp) => {
        const dept = emp.department || "Unknown"
        if (!acc[dept]) {
          acc[dept] = { total: 0, count: 0 }
        }
        acc[dept].total += emp.salary || 0
        acc[dept].count += 1
        return acc
      },
      {} as Record<string, { total: number; count: number }>,
    )

    // Turnover (simplified: count inactive vs total)
    const turnoverRate = totalEmployees > 0 ? (inactiveEmployees / totalEmployees) * 100 : 0

    // Birthdays and anniversaries in current month
    const now = new Date()
    const month = now.getMonth()
    const birthdays = hrState.employees.filter(e => e.dateOfBirth && new Date(e.dateOfBirth).getMonth() === month).length
    const anniversaries = hrState.employees.filter(e => e.hireDate && new Date(e.hireDate).getMonth() === month).length

    // Overtime (mock from hoursPerWeek > max?)
    const overtimeCount = hrState.employees.filter(e => (e.hoursPerWeek || 0) > (e.maxHoursPerWeek || 9999)).length

    return {
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      departmentCounts,
      roleCounts,
      hiringTrends,
      totalTimeOffDays,
      timeOffByType,
      avgPerformanceScore,
      performanceDistribution,
      totalPayroll,
      avgSalary,
      salaryByDepartment,
      turnoverRate,
      birthdays,
      anniversaries,
      overtimeCount,
    }
  }, [filteredEmployees, filteredTimeOff, filteredPerformanceReviews, hrState.employees])

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleDateRangeChange = (start: Date, end: Date, _frequency: string) => {
    setDateRange({ startDate: start, endDate: end })
  }

  const handleExportData = () => {
    // Export analytics data to CSV
    const csvData = [
      ["Metric", "Value"],
      ["Total Employees", analyticsData.totalEmployees],
      ["Active Employees", analyticsData.activeEmployees],
      ["Inactive Employees", analyticsData.inactiveEmployees],
      ["Average Performance Score", analyticsData.avgPerformanceScore.toFixed(2)],
      ["Total Payroll", `$${analyticsData.totalPayroll.toLocaleString()}`],
      ["Average Salary", `$${analyticsData.avgSalary.toLocaleString()}`],
      ["Total Time Off Days", analyticsData.totalTimeOffDays],
    ]

    const csvContent = csvData.map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `hr-analytics-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const refreshData = () => {
    setLoading(true)
    // Simulate data refresh
    setTimeout(() => {
      setLoading(false)
    }, 1000)
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

  if (!canViewAnalytics) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">You don't have permission to view HR analytics.</Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            HR Analytics
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Comprehensive HR insights and performance metrics
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button startIcon={<RefreshIcon />} onClick={refreshData} disabled={loading}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleExportData}>
            Export Data
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <DateRangeSelector onDateRangeChange={handleDateRangeChange} />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Department</InputLabel>
              <Select
                value={selectedDepartment}
                label="Department"
                onChange={(e) => setSelectedDepartment(e.target.value)}
              >
                <MenuItem value="all">All Departments</MenuItem>
                {Object.keys(analyticsData.departmentCounts).map((dept) => (
                  <MenuItem key={dept} value={dept}>
                    {dept.charAt(0).toUpperCase() + dept.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Role</InputLabel>
              <Select value={selectedRole} label="Role" onChange={(e) => setSelectedRole(e.target.value)}>
                <MenuItem value="all">All Roles</MenuItem>
                {Object.keys(analyticsData.roleCounts).map((role) => (
                  <MenuItem key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Key Metrics Cards */}
      <StatsSection
        stats={[
          {
            value: analyticsData.totalEmployees,
            label: "Total Employees",
            color: "primary"
          },
          {
            value: analyticsData.activeEmployees,
            label: "Active Employees",
            color: "success"
          },
          {
            value: analyticsData.avgPerformanceScore.toFixed(1),
            label: "Avg Performance",
            color: "warning"
          },
          {
            value: `$${analyticsData.totalPayroll.toLocaleString()}`,
            label: "Total Payroll",
            color: "info"
          }
        ]}
      />

      {/* Tabs */}
      <Paper sx={{ width: "100%" }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="analytics tabs">
          <Tab icon={<TrendingUpIcon />} label="Overview" />
          <Tab icon={<PeopleIcon />} label="Workforce" />
          <Tab icon={<PerformanceIcon />} label="Performance" />
          <Tab icon={<ScheduleIcon />} label="Time Off" />
          <Tab icon={<AttachMoneyIcon />} label="Payroll" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            {/* Hiring Trends */}
            <Grid item xs={12} lg={8}>
              <Card>
                <CardHeader title="Hiring Trends" />
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analyticsData.hiringTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="hires"
                        stroke={theme.palette.primary.main}
                        strokeWidth={2}
                        name="New Hires"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Employee Status */}
            <Grid item xs={12} lg={4}>
              <Card>
                <CardHeader title="Employee Status" />
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Active", value: analyticsData.activeEmployees },
                          { name: "Inactive", value: analyticsData.inactiveEmployees },
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
                        <Cell fill={theme.palette.error.main} />
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            {/* Department Distribution */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Department Distribution" />
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={Object.entries(analyticsData.departmentCounts).map(([dept, count]) => ({
                        department: dept.charAt(0).toUpperCase() + dept.slice(1),
                        employees: count,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="department" />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar dataKey="employees" fill={theme.palette.primary.main} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Role Distribution */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Role Distribution" />
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={Object.entries(analyticsData.roleCounts).map(([role, count]) => ({
                          name: role.charAt(0).toUpperCase() + role.slice(1),
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
                        {Object.keys(analyticsData.roleCounts).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Employee List */}
            <Grid item xs={12}>
              <Card>
                <CardHeader title="Employee Details" />
                <CardContent>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Employee</TableCell>
                          <TableCell>Department</TableCell>
                          <TableCell>Role</TableCell>
                          <TableCell>Hire Date</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Salary</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredEmployees
                          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                          .map((employee) => (
                            <TableRow key={employee.id}>
                              <TableCell>
                                <Box sx={{ display: "flex", alignItems: "center" }}>
                                  <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                                    <PersonIcon />
                                  </Avatar>
                                  <Box>
                                    <Typography variant="body2" fontWeight={500}>
                                      {employee.firstName} {employee.lastName}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {employee.email}
                                    </Typography>
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Chip label={employee.department || "Unknown"} size="small" variant="outlined" />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={employee.role?.toString() || "Unknown"}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>{format(new Date(employee.hireDate), "MMM dd, yyyy")}</TableCell>
                              <TableCell>
                                <Chip
                                  label={employee.status}
                                  size="small"
                                  color={employee.status === "active" ? "success" : "error"}
                                />
                              </TableCell>
                              <TableCell>${employee.salary?.toLocaleString() || "N/A"}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={filteredEmployees.length}
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
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            {/* Performance Distribution */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Performance Distribution" />
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={Object.entries(analyticsData.performanceDistribution).map(([rating, count]) => ({
                        rating,
                        employees: count,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="rating" />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar dataKey="employees" fill={theme.palette.secondary.main} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Performance Metrics */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Performance Metrics" />
                <CardContent>
                  <List>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: theme.palette.success.main }}>
                          <PerformanceIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary="Average Score"
                        secondary={`${analyticsData.avgPerformanceScore.toFixed(2)} / 5.0`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: theme.palette.info.main }}>
                          <AssignmentIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary="Reviews Completed"
                        secondary={`${filteredPerformanceReviews.length} reviews`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: theme.palette.warning.main }}>
                          <TrendingUpIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary="Top Performers"
                        secondary={`${analyticsData.performanceDistribution.Excellent || 0} employees`}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            {/* Time Off by Type */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Time Off by Type" />
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={Object.entries(analyticsData.timeOffByType).map(([type, count]) => ({
                          name: type.charAt(0).toUpperCase() + type.slice(1),
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
                        {Object.keys(analyticsData.timeOffByType).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Time Off Summary */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Time Off Summary" />
                <CardContent>
                  <List>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                          <TimeIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText primary="Total Days Off" secondary={`${analyticsData.totalTimeOffDays} days`} />
                    </ListItem>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: theme.palette.success.main }}>
                          <CheckCircleIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary="Approved Requests"
                        secondary={`${filteredTimeOff.filter((r) => r.status === "approved").length} requests`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: theme.palette.warning.main }}>
                          <ScheduleIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary="Pending Requests"
                        secondary={`${filteredTimeOff.filter((r) => r.status === "pending").length} requests`}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <Grid container spacing={3}>
            {/* Salary by Department */}
            <Grid item xs={12}>
              <Card>
                <CardHeader title="Average Salary by Department" />
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={Object.entries(analyticsData.salaryByDepartment).map(([dept, data]) => ({
                        department: dept.charAt(0).toUpperCase() + dept.slice(1),
                        avgSalary: data.count > 0 ? data.total / data.count : 0,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="department" />
                      <YAxis />
                      <RechartsTooltip
                        formatter={(value: number) => [`$${value.toLocaleString()}`, "Average Salary"]}
                      />
                      <Bar dataKey="avgSalary" fill={theme.palette.success.main} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Payroll Summary */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Payroll Summary" />
                <CardContent>
                  <List>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: theme.palette.success.main }}>
                          <AttachMoneyIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary="Total Payroll"
                        secondary={`$${analyticsData.totalPayroll.toLocaleString()}`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: theme.palette.info.main }}>
                          <TrendingUpIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary="Average Salary"
                        secondary={`$${analyticsData.avgSalary.toLocaleString()}`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                          <PeopleIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary="Employees on Payroll"
                        secondary={`${analyticsData.totalEmployees} employees`}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>
    </Box>
  )
}

export default HRAnalytics
