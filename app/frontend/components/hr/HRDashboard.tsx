"use client"

import React from "react"

import type { ReactElement } from "react"
import { useState, useEffect } from "react"
import { themeConfig } from "../../../theme/AppTheme"
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Button,
  useTheme,
} from "@mui/material"
import {
  PersonAdd as PersonAddIcon,
  Warning as WarningIcon,
  EventBusy as EventBusyIcon,
  School as SchoolIcon,
  Assessment as AssessmentIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts"
import { useHRReportContext } from "../../../backend/context/AnalyticsContext"
import StatsSection from "../reusable/StatsSection"
// Company state is now handled through HRContext

// Chart palette: keep semantic colors, replace purple with navy-light accent.
const COLORS = [
  "#1976d2",
  "#2e7d32",
  "#ed6c02",
  "#d32f2f",
  themeConfig.colors.primary.light,
  "#388e3c",
]

const HRDashboard: React.FC = (): ReactElement => {
  const theme = useTheme()
  const { hr, hrState } = useHRReportContext()
  const { refreshEmployees, refreshRoles } = hr
  // Company state is now handled through HRContext

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dashboardData, setDashboardData] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    newHires: 0,
    terminations: 0,
    pendingTimeOff: 0,
    activeWarnings: 0,
    upcomingReviews: 0,
    trainingProgress: 0,
  })

  // Mock data for charts
  const departmentData = [
    { name: "Kitchen", employees: 12, fill: COLORS[0] },
    { name: "Front of House", employees: 8, fill: COLORS[1] },
    { name: "Bar", employees: 6, fill: COLORS[2] },
    { name: "Management", employees: 4, fill: COLORS[3] },
    { name: "Maintenance", employees: 3, fill: COLORS[4] },
  ]

  const performanceData = [
    { month: "Jan", excellent: 15, good: 12, average: 5, poor: 1 },
    { month: "Feb", excellent: 18, good: 10, average: 4, poor: 1 },
    { month: "Mar", excellent: 20, good: 9, average: 3, poor: 1 },
    { month: "Apr", excellent: 22, good: 8, average: 2, poor: 1 },
    { month: "May", excellent: 25, good: 7, average: 1, poor: 0 },
  ]

  const turnoverData = [
    { month: "Jan", hires: 3, terminations: 1 },
    { month: "Feb", hires: 2, terminations: 2 },
    { month: "Mar", hires: 4, terminations: 1 },
    { month: "Apr", hires: 1, terminations: 3 },
    { month: "May", hires: 5, terminations: 0 },
  ]

  const recentActivities = [
    {
      id: 1,
      type: "hire",
      message: "New employee John Smith joined Kitchen department",
      timestamp: "2 hours ago",
      icon: <PersonAddIcon color="success" />,
    },
    {
      id: 2,
      type: "warning",
      message: "Warning issued to Sarah Wilson for attendance",
      timestamp: "4 hours ago",
      icon: <WarningIcon color="warning" />,
    },
    {
      id: 3,
      type: "timeoff",
      message: "Time off request approved for Michael Brown",
      timestamp: "6 hours ago",
      icon: <EventBusyIcon color="info" />,
    },
    {
      id: 4,
      type: "training",
      message: "Food Safety training completed by 5 employees",
      timestamp: "1 day ago",
      icon: <SchoolIcon color="primary" />,
    },
    {
      id: 5,
      type: "review",
      message: "Performance review scheduled for Emma Davis",
      timestamp: "2 days ago",
      icon: <AssessmentIcon sx={{ color: themeConfig.colors.primary.light }} />,
    },
  ]

  // Data is loaded centrally by HRContext on HR entry.
  // Avoid fetching-on-navigation here; just derive metrics from state.
  useEffect(() => {
    try {
      const totalEmployees = hrState.employees.length
      const activeEmployees = hrState.employees.filter((emp) => emp.status === "active").length
      const newHires = hrState.employees.filter((emp) => {
        const hireDate = new Date(emp.hireDate)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        return hireDate >= thirtyDaysAgo
      }).length

      setDashboardData({
        totalEmployees,
        activeEmployees,
        newHires,
        terminations: 2, // Mock data
        pendingTimeOff: 5, // Mock data
        activeWarnings: 3, // Mock data
        upcomingReviews: 8, // Mock data
        trainingProgress: 75, // Mock data
      })
    } catch (err) {
      console.error("Error computing dashboard data:", err)
      setError("Failed to load dashboard data")
    } finally {
      // keep local spinner off; UI should remain stable during background refreshes
      setLoading(false)
    }
  }, [hrState.employees])

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        HR Dashboard
      </Typography>

      {/* Key Metrics Cards */}
      <StatsSection
        stats={[
          {
            value: dashboardData.totalEmployees,
            label: "Total Employees",
            color: "primary"
          },
          {
            value: dashboardData.activeEmployees,
            label: "Active Employees",
            color: "success"
          },
          {
            value: dashboardData.pendingTimeOff,
            label: "Pending Time Off",
            color: "warning"
          },
          {
            value: dashboardData.activeWarnings,
            label: "Active Warnings",
            color: "error"
          }
        ]}
      />

      {/* Charts and Analytics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Employees by Department
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                  <Pie
                  data={departmentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                    fill={theme.palette.primary.main}
                  dataKey="employees"
                >
                  {departmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Performance Trends
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="excellent" stackId="a" fill={COLORS[0]} />
                <Bar dataKey="good" stackId="a" fill={COLORS[1]} />
                <Bar dataKey="average" stackId="a" fill={COLORS[2]} />
                <Bar dataKey="poor" stackId="a" fill={COLORS[3]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Hiring vs Termination Trends
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={turnoverData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="hires" stroke={COLORS[0]} strokeWidth={2} />
                <Line type="monotone" dataKey="terminations" stroke={COLORS[3]} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Quick Actions and Recent Activities */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<PersonAddIcon />}
                  sx={{ justifyContent: "flex-start" }}
                >
                  Add New Employee
                </Button>
              </Grid>
              <Grid item xs={12}>
                <Button fullWidth variant="outlined" startIcon={<ScheduleIcon />} sx={{ justifyContent: "flex-start" }}>
                  Manage Schedules
                </Button>
              </Grid>
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<AssessmentIcon />}
                  sx={{ justifyContent: "flex-start" }}
                >
                  Performance Reviews
                </Button>
              </Grid>
              <Grid item xs={12}>
                <Button fullWidth variant="outlined" startIcon={<SchoolIcon />} sx={{ justifyContent: "flex-start" }}>
                  Training Management
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Upcoming Tasks
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <AssessmentIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Performance Reviews Due"
                  secondary={`${dashboardData.upcomingReviews} reviews scheduled this month`}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <EventBusyIcon color="warning" />
                </ListItemIcon>
                <ListItemText
                  primary="Time Off Requests"
                  secondary={`${dashboardData.pendingTimeOff} requests pending approval`}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <SchoolIcon color="info" />
                </ListItemIcon>
                <ListItemText
                  primary="Training Progress"
                  secondary={`${dashboardData.trainingProgress}% completion rate`}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <WarningIcon color="error" />
                </ListItemIcon>
                <ListItemText
                  primary="Active Warnings"
                  secondary={`${dashboardData.activeWarnings} warnings require follow-up`}
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <List dense>
              {recentActivities.map((activity, index) => (
                <React.Fragment key={activity.id}>
                  <ListItem>
                    <ListItemIcon>{activity.icon}</ListItemIcon>
                    <ListItemText
                      primary={activity.message}
                      secondary={activity.timestamp}
                      primaryTypographyProps={{ variant: "body2" }}
                      secondaryTypographyProps={{ variant: "caption" }}
                    />
                  </ListItem>
                  {index < recentActivities.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* Department Overview */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Department Overview
            </Typography>
            <Grid container spacing={2}>
              {departmentData.map((dept) => (
                <Grid item xs={12} sm={6} md={2.4} key={dept.name}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: "center" }}>
                      <Typography variant="h4" color="primary">
                        {dept.employees}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {dept.name}
                      </Typography>
                      <Chip
                        label={`${((dept.employees / dashboardData.totalEmployees) * 100).toFixed(1)}%`}
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default HRDashboard
