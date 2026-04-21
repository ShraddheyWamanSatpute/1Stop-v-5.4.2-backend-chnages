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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Divider,
  Avatar,
  Snackbar,
} from "@mui/material"
import {
  Diversity3 as DiversityIcon,
  School as SchoolIcon,
  Celebration as CelebrationIcon,
  People as PeopleIcon,
  Accessibility as AccessibilityIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  BarChart as BarChartIcon,
} from "@mui/icons-material"
import EmptyStateCard from "../reusable/EmptyStateCard"
import { useHR } from "../../../backend/context/HRContext"
import DataHeader from "../reusable/DataHeader"
// Company state is now handled through HRContext
import type { DiversityInitiative, DiversitySurvey } from "../../../backend/interfaces/HRs"
// Functions now accessed through HRContext

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
      id={`diversity-tabpanel-${index}`}
      aria-labelledby={`diversity-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

const DiversityInclusion: React.FC = () => {
  const {
    state: hrState,
    refreshDiversityInitiatives,
    createDiversityInitiative,
    updateDiversityInitiative,
    deleteDiversityInitiative,
    refreshDiversitySurveys,
    createDiversitySurvey,
    updateDiversitySurvey,
    deleteDiversitySurvey,
  } = useHR()
  // Company state is now handled through HRContext

  const [tabValue, setTabValue] = useState(0)
  const [openDialog, setOpenDialog] = useState(false)
  const [dialogType, setDialogType] = useState<"initiative" | "survey" | "goal" | "report">("initiative")
  const [selectedItem, setSelectedItem] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null)

  // Local state for diversity data
  const [initiatives, setInitiatives] = useState<DiversityInitiative[]>([])
  const [surveys, setSurveys] = useState<DiversitySurvey[]>([])
  const [diversityMetrics, setDiversityMetrics] = useState<any>(null)

  // Load diversity data
  useEffect(() => {
    loadDiversityData()
  }, []) // Company state handled internally

  useEffect(() => {
    setInitiatives((hrState.diversityInitiatives || []) as DiversityInitiative[])
  }, [hrState.diversityInitiatives])

  useEffect(() => {
    setSurveys((hrState.diversitySurveys || []) as DiversitySurvey[])
  }, [hrState.diversitySurveys])

  const loadDiversityData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        refreshDiversityInitiatives(),
        refreshDiversitySurveys(),
      ])

      calculateDiversityMetrics()
      setError(null)
    } catch (err: any) {
      console.error("Error loading diversity data:", err)
      setError(err.message || "Failed to load diversity data")
    } finally {
      setLoading(false)
    }
  }

  const calculateDiversityMetrics = () => {
    const employees = hrState.employees

    if (employees.length === 0) {
      setDiversityMetrics(null)
      return
    }

    // Calculate basic metrics from employee data
    const totalEmployees = employees.length
    const activeEmployees = employees.filter((emp) => emp.status === "active")

    // Department distribution
    const departmentCounts = employees.reduce((acc: any, emp) => {
      const dept = emp.department || "Unassigned"
      acc[dept] = (acc[dept] || 0) + 1
      return acc
    }, {})

    // Role distribution
    const roleCounts = employees.reduce((acc: any, emp) => {
      const role = typeof emp.role === "object" ? emp.role?.label : emp.role || "Unassigned"
      acc[role] = (acc[role] || 0) + 1
      return acc
    }, {})

    // Gender distribution
    const genderCounts = employees.reduce((acc: any, emp) => {
      const g = (emp.gender || "Unspecified").toString()
      acc[g] = (acc[g] || 0) + 1
      return acc
    }, {})

    // Age bands
    const ageBands = { "<20": 0, "20-29": 0, "30-39": 0, "40-49": 0, "50+": 0 }
    employees.forEach((emp: any) => {
      if (!emp.dateOfBirth) return
      const dob = new Date(emp.dateOfBirth)
      const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      if (age < 20) ageBands["<20"]++
      else if (age < 30) ageBands["20-29"]++
      else if (age < 40) ageBands["30-39"]++
      else if (age < 50) ageBands["40-49"]++
      else ageBands["50+"]++
    })

    const roleCoverage = employees.filter((emp: any) => Boolean(emp.role)).length / totalEmployees
    const departmentCoverage = employees.filter((emp: any) => Boolean(emp.department)).length / totalEmployees
    const genderCoverage = employees.filter((emp: any) => Boolean(emp.gender)).length / totalEmployees
    const ageCoverage = employees.filter((emp: any) => Boolean(emp.dateOfBirth)).length / totalEmployees
    const representedGenderGroups = Object.keys(genderCounts).filter(
      (key) => key && key !== "Unspecified"
    ).length
    const diversityScore = Math.round(
      (
        roleCoverage * 25 +
        departmentCoverage * 25 +
        genderCoverage * 20 +
        ageCoverage * 10 +
        Math.min(representedGenderGroups / 4, 1) * 20
      )
    )

    setDiversityMetrics({
      totalEmployees,
      activeEmployees: activeEmployees.length,
      departmentDistribution: departmentCounts,
      roleDistribution: roleCounts,
      genderDistribution: genderCounts,
      ageBands,
      diversityScore,
    })
  }


  const handleOpenDialog = (type: "initiative" | "survey" | "goal" | "report", item?: any) => {
    setDialogType(type)
    setSelectedItem(item || null)
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setSelectedItem(null)
  }

  const handleSaveInitiative = async (initiativeData: Omit<DiversityInitiative, "id" | "createdAt" | "updatedAt" | "improvementAreas">) => {
    setLoading(true)
    try {
      if (selectedItem) {
        await updateDiversityInitiative(selectedItem.id, initiativeData)
        setNotification({ message: "Initiative updated successfully", type: "success" })
      } else {
        await createDiversityInitiative({
          ...initiativeData,
          improvementAreas: [],
        })
        setNotification({ message: "Initiative created successfully", type: "success" })
      }

      handleCloseDialog()
      setError(null)
      // Refresh data in background without blocking UI
      loadDiversityData().catch(err => console.error("Background refresh error:", err))
    } catch (err: any) {
      console.error("Error saving initiative:", err)
      setError(err.message || "Failed to save initiative")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSurvey = async (surveyData: Omit<DiversitySurvey, "id" | "createdAt" | "updatedAt">) => {
    setLoading(true)
    try {
      if (selectedItem) {
        await updateDiversitySurvey(selectedItem.id, surveyData)
        setNotification({ message: "Survey updated successfully", type: "success" })
      } else {
        await createDiversitySurvey(surveyData)
        setNotification({ message: "Survey created successfully", type: "success" })
      }

      handleCloseDialog()
      setError(null)
      // Refresh data in background without blocking UI
      loadDiversityData().catch(err => console.error("Background refresh error:", err))
    } catch (err: any) {
      console.error("Error saving survey:", err)
      setError(err.message || "Failed to save survey")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteInitiative = async (initiativeId: string) => {
    setLoading(true)
    try {
      await deleteDiversityInitiative(initiativeId)
      setNotification({ message: "Initiative deleted successfully", type: "success" })
      await loadDiversityData()
      setError(null)
    } catch (err: any) {
      console.error("Error deleting initiative:", err)
      setError(err.message || "Failed to delete initiative")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSurvey = async (surveyId: string) => {
    setLoading(true)
    try {
      await deleteDiversitySurvey(surveyId)
      setNotification({ message: "Survey deleted successfully", type: "success" })
      await loadDiversityData()
      setError(null)
    } catch (err: any) {
      console.error("Error deleting survey:", err)
      setError(err.message || "Failed to delete survey")
    } finally {
      setLoading(false)
    }
  }

  const getInitiativeIcon = (category: string) => {
    switch (category) {
      case "training":
        return <SchoolIcon color="primary" />
      case "cultural":
        return <CelebrationIcon color="secondary" />
      case "recruitment":
        return <PeopleIcon color="success" />
      case "accessibility":
        return <AccessibilityIcon color="info" />
      default:
        return <DiversityIcon color="primary" />
    }
  }

  const getStatusChip = (status: string) => {
    switch (status) {
      case "active":
        return <Chip label="Active" size="small" color="success" variant="outlined" />
      case "planning":
        return <Chip label="Planning" size="small" color="primary" variant="outlined" />
      case "completed":
        return <Chip label="Completed" size="small" color="default" variant="outlined" />
      case "upcoming":
        return <Chip label="Upcoming" size="small" color="info" variant="outlined" />
      default:
        return <Chip label={status} size="small" color="default" variant="outlined" />
    }
  }

  // No loading UI — render and let data fill in.

  return (
    <Box sx={{ p: 0 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* DataHeader with tab switches */}
      <DataHeader
        showDateControls={false}
        additionalControls={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
              Overview
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
              Demographics
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
              Initiatives
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
              Surveys
            </Button>
            <Button
              variant={tabValue === 4 ? "contained" : "outlined"}
              size="small"
              onClick={() => setTabValue(4)}
              sx={
                tabValue === 4
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
              Resources
            </Button>
          </Box>
        }
      />

      {/* Overview Tab */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <DiversityIcon color="primary" fontSize="large" sx={{ mr: 2 }} />
                <Typography variant="h5">Diversity & Inclusion Dashboard</Typography>
              </Box>
              <Typography variant="body1" paragraph>
                Track, measure, and improve diversity and inclusion metrics across your organization.
              </Typography>
              {diversityMetrics && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    Your organization has {diversityMetrics.totalEmployees} total employees with{" "}
                    {diversityMetrics.activeEmployees} currently active. Diversity score:{" "}
                    {diversityMetrics.diversityScore}/100
                  </Typography>
                </Alert>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Key Metrics
              </Typography>
              {diversityMetrics ? (
                <>
                  <Grid container spacing={3} sx={{ mb: 3 }}>
                    <Grid item xs={6} sm={3}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Total Employees
                        </Typography>
                        <Typography variant="h6" fontWeight="bold">
                          {diversityMetrics.totalEmployees}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Active Employees
                        </Typography>
                        <Typography variant="h6" fontWeight="bold">
                          {diversityMetrics.activeEmployees}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Departments
                        </Typography>
                        <Typography variant="h6" fontWeight="bold">
                          {Object.keys(diversityMetrics.departmentDistribution).length}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Diversity Score
                        </Typography>
                        <Typography variant="h6" fontWeight="bold">
                          {diversityMetrics.diversityScore}/100
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  <Typography variant="subtitle1" gutterBottom>
                    Department Distribution
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Department</TableCell>
                          <TableCell align="right">Employees</TableCell>
                          <TableCell align="right">Percentage</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(diversityMetrics.departmentDistribution).map(([dept, count]: [string, any]) => (
                          <TableRow key={dept} hover>
                            <TableCell>{dept}</TableCell>
                            <TableCell align="right">{count}</TableCell>
                            <TableCell align="right">
                              {((count / diversityMetrics.totalEmployees) * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              ) : (
                <EmptyStateCard
                  icon={PeopleIcon}
                  title="No employee data available"
                  description="Employee data is required to calculate diversity metrics."
                  cardSx={{ boxShadow: "none" }}
                  contentSx={{ py: 2 }}
                />
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, height: "100%" }}>
              <Typography variant="h6" gutterBottom>
                Active Initiatives
              </Typography>
              {initiatives.filter((init) => init.status === "active").length > 0 ? (
                <List>
                  {initiatives
                    .filter((init) => init.status === "active")
                    .slice(0, 3)
                    .map((initiative) => (
                      <ListItem key={initiative.id}>
                        <ListItemText primary={initiative.title} secondary={`${initiative.progress}% complete`} />
                      </ListItem>
                    ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No active initiatives. Create your first initiative to get started.
                </Typography>
              )}
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog("initiative")}
                sx={{ mt: 2 }}
              >
                New Initiative
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Demographics Tab */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                <Typography variant="h6">Workforce Demographics</Typography>
                <Button variant="outlined" startIcon={<BarChartIcon />}>
                  Export Report
                </Button>
              </Box>

              {diversityMetrics ? (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>
                      Department Distribution
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Department</TableCell>
                            <TableCell align="right">Count</TableCell>
                            <TableCell align="right">Percentage</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.entries(diversityMetrics.departmentDistribution).map(
                            ([dept, count]: [string, any]) => (
                              <TableRow key={dept} hover>
                                <TableCell>{dept}</TableCell>
                                <TableCell align="right">{count}</TableCell>
                                <TableCell align="right">
                                  {((count / diversityMetrics.totalEmployees) * 100).toFixed(1)}%
                                </TableCell>
                              </TableRow>
                            ),
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>
                      Role Distribution
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Role</TableCell>
                            <TableCell align="right">Count</TableCell>
                            <TableCell align="right">Percentage</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.entries(diversityMetrics.roleDistribution).map(([role, count]: [string, any]) => (
                            <TableRow key={role} hover>
                              <TableCell>{role}</TableCell>
                              <TableCell align="right">{count}</TableCell>
                              <TableCell align="right">
                                {((count / diversityMetrics.totalEmployees) * 100).toFixed(1)}%
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                </Grid>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No employee data available for demographic analysis.
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Initiatives Tab */}
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h6">Diversity & Inclusion Initiatives</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog("initiative")}>
            New Initiative
          </Button>
        </Box>

        <Grid container spacing={3}>
          {initiatives.map((initiative) => (
            <Grid item xs={12} md={6} key={initiative.id}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Avatar sx={{ bgcolor: "primary.light", mr: 2 }}>{getInitiativeIcon(initiative.category)}</Avatar>
                      <Box>
                        <Typography variant="h6">{initiative.title}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {initiative.startDate} - {initiative.endDate}
                        </Typography>
                      </Box>
                    </Box>
                    {getStatusChip(initiative.status)}
                  </Box>

                  <Typography variant="body2" paragraph>
                    {initiative.description}
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Progress
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Box sx={{ width: "100%", mr: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={initiative.progress}
                          sx={{ height: 10, borderRadius: 5 }}
                        />
                      </Box>
                      <Box sx={{ minWidth: 35 }}>
                        <Typography variant="body2" fontWeight="bold">
                          {initiative.progress}%
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Participants
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {initiative.participants} employees
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Budget
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        £{initiative.budget}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
                <Divider />
                <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}>
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => handleOpenDialog("initiative", initiative)}
                    sx={{ mr: 1 }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDeleteInitiative(initiative.id)}
                  >
                    Delete
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))}

          {initiatives.length === 0 && (
            <Grid item xs={12}>
              <EmptyStateCard
                icon={CelebrationIcon}
                title="No initiatives yet"
                description="Create your first diversity and inclusion initiative to get started."
                action={
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog("initiative")}>
                    Create First Initiative
                  </Button>
                }
                cardSx={{ maxWidth: 560, mx: "auto", boxShadow: "none" }}
              />
            </Grid>
          )}
        </Grid>
      </TabPanel>

      {/* Surveys Tab */}
      <TabPanel value={tabValue} index={3}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h6">Inclusion Surveys</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog("survey")}>
            New Survey
          </Button>
        </Box>

        <Grid container spacing={3}>
          {surveys.map((survey) => (
            <Grid item xs={12} key={survey.id}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                  <Box>
                    <Typography variant="h6">{survey.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {survey.date}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    {getStatusChip(survey.status)}
                    <IconButton size="small" onClick={() => handleOpenDialog("survey", survey)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeleteSurvey(survey.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                {survey.status === "completed" ? (
                  <>
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                      <Grid item xs={12} sm={4}>
                        <Box
                          sx={{
                            textAlign: "center",
                            p: 2,
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 1,
                          }}
                        >
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Participation Rate
                          </Typography>
                          <Typography variant="h4" fontWeight="bold" sx={{ color: themeConfig.brandColors.navy }}>
                            {survey.participationRate}%
                          </Typography>
                          <Typography variant="body2">{survey.participants} employees</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={8}>
                        <Box
                          sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 1, height: "100%" }}
                        >
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Overall Inclusion Score
                          </Typography>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <Box sx={{ width: "100%", mr: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={survey.overallScore}
                                color={
                                  survey.overallScore >= 80
                                    ? "success"
                                    : survey.overallScore >= 60
                                      ? "primary"
                                      : "error"
                                }
                                sx={{ height: 20, borderRadius: 5 }}
                              />
                            </Box>
                            <Box sx={{ minWidth: 50 }}>
                              <Typography variant="h5" fontWeight="bold">
                                {survey.overallScore}/100
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>

                    <Typography variant="subtitle1" gutterBottom>
                      Key Findings
                    </Typography>
                    <List>
                      {survey.keyFindings.map((finding: string, index: number) => (
                        <ListItem key={index}>
                          <ListItemText primary={finding} />
                        </ListItem>
                      ))}
                    </List>
                  </>
                ) : (
                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <Typography variant="body1" paragraph>
                      This survey is scheduled for {survey.date}.
                    </Typography>
                    <Button variant="contained" startIcon={<CalendarIcon />}>
                      Send Reminders
                    </Button>
                  </Box>
                )}
              </Paper>
            </Grid>
          ))}

          {surveys.length === 0 && (
            <Grid item xs={12}>
              <EmptyStateCard
                icon={BarChartIcon}
                title="No surveys yet"
                description="Create your first inclusion survey to gather feedback from employees."
                action={
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog("survey")}>
                    Create First Survey
                  </Button>
                }
                cardSx={{ maxWidth: 560, mx: "auto", boxShadow: "none" }}
              />
            </Grid>
          )}
        </Grid>
      </TabPanel>

      {/* Resources Tab */}
      <TabPanel value={tabValue} index={4}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Diversity & Inclusion Resources
              </Typography>
              <Typography variant="body1" paragraph>
                Access training materials, policies, and best practices to promote diversity and inclusion.
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Training Materials
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText primary="Unconscious Bias Training" secondary="Interactive workshop materials" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Inclusive Leadership" secondary="Training for managers" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Cultural Awareness" secondary="Understanding diverse backgrounds" />
                  </ListItem>
                </List>
                <Button variant="outlined" fullWidth sx={{ mt: 2 }}>
                  View All Materials
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Policies & Guidelines
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText primary="Diversity & Inclusion Policy" secondary="Updated: May 2023" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Equal Opportunity Employment" secondary="Legal requirements" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Anti-Discrimination Guidelines" secondary="Workplace standards" />
                  </ListItem>
                </List>
                <Button variant="outlined" fullWidth sx={{ mt: 2 }}>
                  View All Policies
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  External Resources
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText primary="Industry Benchmarking" secondary="Compare with standards" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Certification Programs" secondary="Professional development" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Community Partnerships" secondary="Local organizations" />
                  </ListItem>
                </List>
                <Button variant="outlined" fullWidth sx={{ mt: 2 }}>
                  View External Resources
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Initiative Dialog */}
      <Dialog open={openDialog && dialogType === "initiative"} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">{selectedItem ? "Edit Initiative" : "Add New Initiative"}</Typography>
            <IconButton onClick={handleCloseDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <InitiativeForm initiative={selectedItem} onSave={handleSaveInitiative} onCancel={handleCloseDialog} />
        </DialogContent>
      </Dialog>

      {/* Survey Dialog */}
      <Dialog open={openDialog && dialogType === "survey"} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">{selectedItem ? "Edit Survey" : "Create New Survey"}</Typography>
            <IconButton onClick={handleCloseDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <SurveyForm survey={selectedItem} onSave={handleSaveSurvey} onCancel={handleCloseDialog} />
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

// Initiative Form Component
const InitiativeForm: React.FC<{
  initiative?: DiversityInitiative | null
  onSave: (data: any) => void
  onCancel: () => void
}> = ({ initiative, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: initiative?.title || "",
    description: initiative?.description || "",
    category: initiative?.category || "training",
    status: initiative?.status || "planning",
    startDate: initiative?.startDate || new Date().toISOString().split("T")[0],
    endDate: initiative?.endDate || new Date().toISOString().split("T")[0],
    budget: initiative?.budget || 1000,
    participants: initiative?.participants || 10,
    progress: initiative?.progress || 0,
  })

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = () => {
    onSave(formData)
  }

  return (
    <Grid container spacing={2} sx={{ mt: 0.5 }}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Initiative Title"
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
          <InputLabel>Category</InputLabel>
          <Select label="Category" value={formData.category} onChange={(e) => handleChange("category", e.target.value)}>
            <MenuItem value="training">Training</MenuItem>
            <MenuItem value="cultural">Cultural</MenuItem>
            <MenuItem value="recruitment">Recruitment</MenuItem>
            <MenuItem value="accessibility">Accessibility</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Status</InputLabel>
          <Select label="Status" value={formData.status} onChange={(e) => handleChange("status", e.target.value)}>
            <MenuItem value="planning">Planning</MenuItem>
            <MenuItem value="active">Active</MenuItem>
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
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Budget (£)"
          type="number"
          value={formData.budget}
          onChange={(e) => handleChange("budget", Number(e.target.value))}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Expected Participants"
          type="number"
          value={formData.participants}
          onChange={(e) => handleChange("participants", Number(e.target.value))}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Progress (%)"
          type="number"
          value={formData.progress}
          onChange={(e) => handleChange("progress", Number(e.target.value))}
          InputProps={{ inputProps: { min: 0, max: 100 } }}
        />
      </Grid>
      <Grid item xs={12}>
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 2 }}>
          <Button variant="contained" onClick={handleSubmit}>
            {initiative ? "Update Initiative" : "Add Initiative"}
          </Button>
        </Box>
      </Grid>
    </Grid>
  )
}

// Survey Form Component
const SurveyForm: React.FC<{
  survey?: DiversitySurvey | null
  onSave: (data: any) => void
  onCancel: () => void
}> = ({ survey, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: survey?.title || "",
    date: survey?.date || new Date().toISOString().split("T")[0],
    status: survey?.status || "upcoming",
    participants: survey?.participants || 0,
    participationRate: survey?.participationRate || 0,
    overallScore: survey?.overallScore || 0,
    keyFindings: survey?.keyFindings || [],
  })

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = () => {
    onSave(formData)
  }

  return (
    <Grid container spacing={2} sx={{ mt: 0.5 }}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Survey Title"
          value={formData.title}
          onChange={(e) => handleChange("title", e.target.value)}
          required
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Survey Date"
          type="date"
          value={formData.date}
          onChange={(e) => handleChange("date", e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Status</InputLabel>
          <Select label="Status" value={formData.status} onChange={(e) => handleChange("status", e.target.value)}>
            <MenuItem value="upcoming">Upcoming</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      {formData.status === "completed" && (
        <>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Participants"
              type="number"
              value={formData.participants}
              onChange={(e) => handleChange("participants", Number(e.target.value))}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Participation Rate (%)"
              type="number"
              value={formData.participationRate}
              onChange={(e) => handleChange("participationRate", Number(e.target.value))}
              InputProps={{ inputProps: { min: 0, max: 100 } }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Overall Score"
              type="number"
              value={formData.overallScore}
              onChange={(e) => handleChange("overallScore", Number(e.target.value))}
              InputProps={{ inputProps: { min: 0, max: 100 } }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Key Findings (one per line)"
              multiline
              rows={4}
              value={formData.keyFindings.join("\n")}
              onChange={(e) =>
                handleChange(
                  "keyFindings",
                  e.target.value.split("\n").filter((f) => f.trim()),
                )
              }
              helperText="Enter each finding on a new line"
            />
          </Grid>
        </>
      )}
      <Grid item xs={12}>
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 2 }}>
          <Button variant="contained" onClick={handleSubmit}>
            {survey ? "Update Survey" : "Create Survey"}
          </Button>
        </Box>
      </Grid>
    </Grid>
  )
}

export default DiversityInclusion
