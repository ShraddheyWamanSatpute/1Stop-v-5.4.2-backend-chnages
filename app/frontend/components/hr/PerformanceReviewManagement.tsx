import { themeConfig } from "../../../theme/AppTheme";
import { alpha } from "@mui/material/styles";
import React, { useRef, useState, useEffect } from "react"
import { useHR } from "../../../backend/context/HRContext"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import PerformanceCRUDForm, { type PerformanceCRUDFormHandle } from "./forms/PerformanceCRUDForm"
import DataHeader from "../reusable/DataHeader"
import { useLocation } from "react-router-dom"
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Rating,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  TextField,
  Typography,
  Avatar,
  Snackbar,
  Alert
} from "@mui/material"
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from "@mui/icons-material"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { PerformanceReviewForm } from "../../../backend/interfaces/HRs"
import { usePermission } from "../../hooks/usePermission"
import EmptyStateCard from "../reusable/EmptyStateCard"
import { Assessment as AssessmentIcon } from "@mui/icons-material"
import { exportReportContainerToCsv } from "../../utils/reportExport"

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
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

const defaultQualifications = [
  "Customer Service Excellence",
  "Product Knowledge", 
  "Sales Techniques",
  "Team Collaboration",
  "Problem Solving",
  "Communication Skills",
  "Time Management",
  "Adaptability",
  "Leadership Potential",
  "Technical Proficiency"
]

const qualificationLevels = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "expert", label: "Expert" }
]

const PerformanceReviewManagement: React.FC = () => {
  const location = useLocation()
  const { state, refreshPerformanceReviews, addPerformanceReview, updatePerformanceReview, deletePerformanceReview } = useHR()
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("hr", "performance")
  const canRemove = canDelete("hr", "performance")

  // Main tab state
  const [mainTab, setMainTab] = useState(0)

  // New CRUD Modal state
  const [performanceCRUDModalOpen, setPerformanceCRUDModalOpen] = useState(false)
  const [selectedPerformanceForCRUD, setSelectedPerformanceForCRUD] = useState<any>(null)
  const [crudMode, setCrudMode] = useState<'create' | 'edit' | 'view'>('create')
  const performanceCRUDFormRef = useRef<PerformanceCRUDFormHandle | null>(null)

  // Legacy system state
  const [legacyFormData, setLegacyFormData] = useState<Partial<PerformanceReviewForm>>({
    employeeId: "",
    employeeName: "",
    reviewerId: "",
    reviewerName: "",
    reviewType: "Annual",
    reviewDate: "",
    dueDate: "",
    status: "Scheduled",
    overallRating: 0,
    categoryRatings: [],
    strengths: [""],
    areasForImprovement: [""],
    goals: [{ description: "", status: "not_started" }],
    comments: "",
  })
  const [legacyOpenDialog, setLegacyOpenDialog] = useState(false)
  const [legacyDialogTab, setLegacyDialogTab] = useState(0)

  // Qualification system state
  const [qualificationFormData, setQualificationFormData] = useState<Partial<PerformanceReviewForm>>({
    employeeId: "",
    employeeName: "",
    reviewerId: "",
    reviewerName: "",
    reviewType: "Annual",
    reviewDate: "",
    dueDate: "",
    status: "Scheduled",
    qualificationAssessment: defaultQualifications.map(qual => ({
      qualification: qual,
      currentLevel: "beginner",
      targetLevel: "intermediate",
      evidence: [],
      developmentPlan: ""
    })),
    lengthOfServiceBonus: {
      months: 0,
      bonusPercentage: 0,
      applied: false
    },
    strengths: [""],
    areasForImprovement: [""],
    goals: [{ description: "", status: "not_started" }],
    comments: "",
  })
  const [qualificationOpenDialog, setQualificationOpenDialog] = useState(false)
  const [qualificationDialogTab, setQualificationDialogTab] = useState(0)

  // Common state
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [sortBy, setSortBy] = useState<string>('reviewDate')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "warning" | "info"
  })
  const reportRef = React.useRef<HTMLDivElement | null>(null)

  // Use performance reviews from HR context state
  const reviews = state.performanceReviews || []

  // Data is loaded centrally by HRContext on HR entry.
  // Avoid fetching-on-navigation here; use explicit refresh actions instead.

  const handleLegacySave = async () => {
    setLoading(true)
    try {
      console.log("Saving legacy review:", legacyFormData)
      setSnackbar({
        open: true,
        message: "Review saved successfully",
        severity: "success"
      })
      setLegacyOpenDialog(false)
      await refreshPerformanceReviews()
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to save review",
        severity: "error"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleQualificationSave = async () => {
    if (!canMutate) return
    setLoading(true)
    try {
      // Set reminder nextSend based on selected frequency
      const goals = (qualificationFormData.goals || []).map((g: any) => {
        if (!g.reminder || !g.reminder.frequency) return g
        const now = new Date()
        const next = new Date(now)
        if (g.reminder.frequency === 'weekly') next.setDate(now.getDate() + 7)
        if (g.reminder.frequency === 'monthly') next.setMonth(now.getMonth() + 1)
        return { ...g, reminder: { ...g.reminder, lastSent: now.getTime(), nextSend: next.getTime() } }
      })
      setQualificationFormData(prev => ({ ...prev, goals }))
      setSnackbar({
        open: true,
        message: "Review saved successfully", 
        severity: "success"
      })
      setQualificationOpenDialog(false)
      await refreshPerformanceReviews()
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to save review",
        severity: "error"
      })
    } finally {
      setLoading(false)
    }
  }


  // New CRUD Modal handlers
  const handleOpenPerformanceCRUD = (performance: any = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    if ((mode === "create" || mode === "edit") && !canMutate) return
    setSelectedPerformanceForCRUD(performance)
    setCrudMode(mode)
    setPerformanceCRUDModalOpen(true)
  }

  const handleClosePerformanceCRUD = () => {
    setPerformanceCRUDModalOpen(false)
    setSelectedPerformanceForCRUD(null)
    setCrudMode('create')
  }

  const handleSavePerformanceCRUD = async (performanceData: any) => {
    if (!canMutate) return
    try {
      if (crudMode === 'create') {
        await addPerformanceReview(performanceData)
        setSnackbar({ open: true, message: 'Performance review created successfully', severity: 'success' })
      } else if (crudMode === 'edit' && selectedPerformanceForCRUD) {
        await updatePerformanceReview(selectedPerformanceForCRUD.id, performanceData)
        setSnackbar({ open: true, message: 'Performance review updated successfully', severity: 'success' })
      }
      handleClosePerformanceCRUD()
      await refreshPerformanceReviews()
    } catch (error) {
      console.error('Error saving performance review:', error)
      setSnackbar({ open: true, message: 'Failed to save performance review', severity: 'error' })
    }
  }

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false })
  }

  const handleDeleteReview = async (reviewId: string) => {
    if (!canRemove) return
    try {
      const deleted = await deletePerformanceReview(reviewId)
      if (!deleted) {
        throw new Error("Delete returned false")
      }
      setSnackbar({ open: true, message: 'Review deleted successfully', severity: 'success' })
      await refreshPerformanceReviews()
    } catch (error) {
      console.error('Error deleting review:', error)
      setSnackbar({ open: true, message: 'Failed to delete review', severity: 'error' })
    }
  }

  // DataHeader handlers
  const handleSortChange = (value: string, direction: 'asc' | 'desc') => {
    setSortBy(value)
    setSortOrder(direction)
  }

  const handleRefresh = () => {
    refreshPerformanceReviews()
  }

  const handleExportCSV = () => {
    exportReportContainerToCsv(reportRef.current, "performance-reviews.csv")
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed": return "success"
      case "In Progress": return "warning"
      case "Scheduled": return "info"
      case "Overdue": return "error"
      default: return "default"
    }
  }

  // Helper function to get employee name from ID
  const getEmployeeName = (employeeId: string) => {
    const employee = state.employees?.find(emp => emp.id === employeeId)
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee'
  }

  const filteredReviews = reviews.filter(review => {
    // Get employee and reviewer names, with safety checks
    const employeeName = review.employeeName || getEmployeeName(review.employeeId) || ''
    const reviewerName = review.reviewerName || getEmployeeName(review.reviewerId) || ''
    
    const matchesSearch = employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reviewerName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(review.status)
    const matchesType = typeFilter.length === 0 || typeFilter.includes(review.reviewType)
    return matchesSearch && matchesStatus && matchesType
  })

  // Sort filtered reviews
  const sortedReviews = [...filteredReviews].sort((a, b) => {
    let aValue = ''
    let bValue = ''
    
    switch (sortBy) {
      case 'reviewDate':
        aValue = a.reviewDate || ''
        bValue = b.reviewDate || ''
        break
      case 'dueDate':
        aValue = a.dueDate || ''
        bValue = b.dueDate || ''
        break
      case 'status':
        aValue = a.status || ''
        bValue = b.status || ''
        break
      case 'reviewType':
        aValue = a.reviewType || ''
        bValue = b.reviewType || ''
        break
      case 'overallRating':
        aValue = a.overallRating?.toString() || '0'
        bValue = b.overallRating?.toString() || '0'
        break
      default:
        aValue = a.reviewDate || ''
        bValue = b.reviewDate || ''
    }
    
    const comparison = aValue.localeCompare(bValue)
    return sortOrder === 'asc' ? comparison : -comparison
  })

  // DataHeader configuration
  const filters = [
    {
      label: "Status",
      options: [
        { id: "Scheduled", name: "Scheduled", color: "#2196f3" },
        { id: "In Progress", name: "In Progress", color: "#ff9800" },
        { id: "Completed", name: "Completed", color: "#4caf50" },
        { id: "Overdue", name: "Overdue", color: "#f44336" },
      ],
      selectedValues: statusFilter,
      onSelectionChange: setStatusFilter,
    },
    {
      label: "Type",
      options: [
        { id: "Annual", name: "Annual", color: themeConfig.colors.primary.light },
        { id: "Quarterly", name: "Quarterly", color: "#3f51b5" },
        { id: "Monthly", name: "Monthly", color: "#00bcd4" },
        { id: "Probation", name: "Probation", color: "#ff5722" },
      ],
      selectedValues: typeFilter,
      onSelectionChange: setTypeFilter,
    },
  ]

  const sortOptions = [
    { value: "reviewDate", label: "Review Date" },
    { value: "dueDate", label: "Due Date" },
    { value: "status", label: "Status" },
    { value: "reviewType", label: "Type" },
    { value: "overallRating", label: "Rating" },
  ]

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box ref={reportRef} sx={{ width: "100%", p: 0 }}>
        <DataHeader
          onCreateNew={() => handleOpenPerformanceCRUD(null, 'create')}
          onExportCSV={handleExportCSV}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search performance reviews..."
          showDateControls={false}
          filters={filters}
          filtersExpanded={filtersExpanded}
          onFiltersToggle={() => setFiltersExpanded(!filtersExpanded)}
          sortOptions={sortOptions}
          sortValue={sortBy}
          sortDirection={sortOrder}
          onSortChange={handleSortChange}
          onRefresh={handleRefresh}
          createDisabled={!canMutate}
          createDisabledTooltip="You don't have permission to create or edit performance reviews."
          additionalControls={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Button
                variant={mainTab === 0 ? "contained" : "outlined"}
                size="small"
                onClick={() => setMainTab(0)}
                sx={
                  mainTab === 0
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
                Rating System
              </Button>
              <Button
                variant={mainTab === 1 ? "contained" : "outlined"}
                size="small"
                onClick={() => setMainTab(1)}
                sx={
                  mainTab === 1
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
                Qualification System
              </Button>
            </Box>
          }
        />


        {/* Rating System Tab */}
        {mainTab === 0 && (
          <>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6">Legacy Rating-Based Reviews</Typography>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />} 
              onClick={() => handleOpenPerformanceCRUD(null, 'create')}
              disabled={!canMutate}
            >
              New Legacy Review
            </Button>
          </Box>

          {/* Reviews Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', userSelect: 'none' }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Employee</Typography></TableCell>
                  <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', userSelect: 'none' }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Reviewer</Typography></TableCell>
                  <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', userSelect: 'none' }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Type</Typography></TableCell>
                  <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', userSelect: 'none' }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Review Date</Typography></TableCell>
                  <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', userSelect: 'none' }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Due Date</Typography></TableCell>
                  <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', userSelect: 'none' }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Status</Typography></TableCell>
                  <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', userSelect: 'none' }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Overall Rating</Typography></TableCell>
                  <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', userSelect: 'none' }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Actions</Typography></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedReviews.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <EmptyStateCard
                        icon={AssessmentIcon}
                        title={reviews.length === 0 ? "No reviews found" : "No reviews match your current filters"}
                        description={reviews.length === 0 ? "Create a review to get started." : "Try adjusting your search or filters."}
                        cardSx={{ maxWidth: 560, mx: "auto", boxShadow: "none" }}
                        contentSx={{ py: 2 }}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedReviews.map((review) => (
                    <TableRow key={review.id} hover onClick={() => { setLegacyFormData(review); setLegacyOpenDialog(true); }} sx={{ cursor: "pointer", '& > td': { paddingTop: 1, paddingBottom: 1 } }}>
                      <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Avatar sx={{ mr: 1, width: 32, height: 32 }}>
                            {(review.employeeName || getEmployeeName(review.employeeId) || 'U').charAt(0)}
                          </Avatar>
                          {review.employeeName || getEmployeeName(review.employeeId) || 'Unknown Employee'}
                        </Box>
                      </TableCell>
                      <TableCell align="center" sx={{ verticalAlign: 'middle' }}>{review.reviewerName || getEmployeeName(review.reviewerId) || 'Unknown Reviewer'}</TableCell>
                      <TableCell align="center" sx={{ verticalAlign: 'middle' }}>{review.reviewType}</TableCell>
                      <TableCell align="center" sx={{ verticalAlign: 'middle' }}>{review.reviewDate}</TableCell>
                      <TableCell align="center" sx={{ verticalAlign: 'middle' }}>{review.dueDate}</TableCell>
                      <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                        <Chip
                          label={review.status}
                          color={getStatusColor(review.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                        <Rating value={review.overallRating} readOnly size="small" />
                      </TableCell>
                      <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                        <Box display="flex" gap={1} justifyContent="center">
                          <IconButton
                            size="small"
                            color="primary"
                            disabled={!canMutate}
                            onClick={(e) => { e.stopPropagation(); setLegacyFormData(review); setLegacyOpenDialog(true); }}
                            title={canMutate ? "Edit" : "No permission to edit"}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={!canRemove}
                            onClick={(e) => { e.stopPropagation(); if (review.id) handleDeleteReview(review.id); }}
                            title={canRemove ? "Delete" : "No permission to delete"}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          </>
        )}

        {/* Qualification System Tab */}
        {mainTab === 1 && (
          <>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6">Qualification-Based Reviews</Typography>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />} 
              onClick={() => setQualificationOpenDialog(true)}
              disabled={!canMutate}
            >
              New Qualification Review
            </Button>
          </Box>

          {/* Qualification Reviews Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Reviewer</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Review Date</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Qualification Progress</TableCell>
                  <TableCell>Length of Service Bonus</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredReviews.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      No reviews found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                            {(review.employeeName || getEmployeeName(review.employeeId) || 'U').charAt(0)}
                          </Avatar>
                          {review.employeeName || getEmployeeName(review.employeeId) || 'Unknown Employee'}
                        </Box>
                      </TableCell>
                      <TableCell>{review.reviewerName || getEmployeeName(review.reviewerId) || 'Unknown Reviewer'}</TableCell>
                      <TableCell>{review.reviewType}</TableCell>
                      <TableCell>{review.reviewDate}</TableCell>
                      <TableCell>{review.dueDate}</TableCell>
                      <TableCell>
                        <Chip
                          label={review.status}
                          color={getStatusColor(review.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Typography variant="body2">75%</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {review.lengthOfServiceBonus?.bonusPercentage || 0}%
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => {
                          setQualificationFormData(review)
                          setQualificationOpenDialog(true)
                        }}>
                          <EditIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          </>
        )}

        {/* Legacy Review Dialog */}
        <Dialog
          open={legacyOpenDialog}
          onClose={() => setLegacyOpenDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Legacy Performance Review</DialogTitle>
          <DialogContent>
            <Tabs value={legacyDialogTab} onChange={(_, newValue) => setLegacyDialogTab(newValue)}>
              <Tab label="Basic Info" />
              <Tab label="Ratings" />
              <Tab label="Feedback" />
              <Tab label="Goals" />
            </Tabs>

            <TabPanel value={legacyDialogTab} index={0}>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Employee</InputLabel>
                    <Select
                      value={legacyFormData.employeeId}
                      onChange={(e) => {
                        const employee = state.employees?.find((emp: any) => emp.id === e.target.value)
                        setLegacyFormData(prev => ({
                          ...prev,
                          employeeId: e.target.value,
                          employeeName: employee ? `${employee.firstName} ${employee.lastName}` : ""
                        }))
                      }}
                      label="Employee"
                    >
                      {state.employees?.map((employee: any) => (
                        <MenuItem key={employee.id} value={employee.id}>
                          {`${employee.firstName} ${employee.lastName}`}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Reviewer Name"
                    value={legacyFormData.reviewerName}
                    onChange={(e) => setLegacyFormData(prev => ({ ...prev, reviewerName: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Review Type</InputLabel>
                    <Select
                      value={legacyFormData.reviewType}
                      onChange={(e) => setLegacyFormData(prev => ({ ...prev, reviewType: e.target.value }))}
                      label="Review Type"
                    >
                      <MenuItem value="Annual">Annual</MenuItem>
                      <MenuItem value="Probation">Probation</MenuItem>
                      <MenuItem value="Quarterly">Quarterly</MenuItem>
                      <MenuItem value="Mid-Year">Mid-Year</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={legacyFormData.status}
                      onChange={(e) => setLegacyFormData(prev => ({ ...prev, status: e.target.value }))}
                      label="Status"
                    >
                      <MenuItem value="Scheduled">Scheduled</MenuItem>
                      <MenuItem value="In Progress">In Progress</MenuItem>
                      <MenuItem value="Completed">Completed</MenuItem>
                      <MenuItem value="Overdue">Overdue</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DatePicker
                    label="Review Date"
                    value={legacyFormData.reviewDate ? new Date(legacyFormData.reviewDate) : null}
                    onChange={(date) => setLegacyFormData(prev => ({ ...prev, reviewDate: date?.toISOString() || "" }))}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DatePicker
                    label="Due Date"
                    value={legacyFormData.dueDate ? new Date(legacyFormData.dueDate) : null}
                    onChange={(date) => setLegacyFormData(prev => ({ ...prev, dueDate: date?.toISOString() || "" }))}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value={legacyDialogTab} index={1}>
              <Typography variant="h6" gutterBottom>
                Overall Rating
              </Typography>
              <Rating
                value={legacyFormData.overallRating}
                onChange={(_, newValue) => setLegacyFormData(prev => ({ ...prev, overallRating: newValue || 0 }))}
                size="large"
              />
            </TabPanel>

            <TabPanel value={legacyDialogTab} index={2}>
              <Typography variant="h6" gutterBottom>
                Strengths
              </Typography>
              {legacyFormData.strengths?.map((strength: string, index: number) => (
                <TextField
                  key={index}
                  fullWidth
                  multiline
                  rows={2}
                  label={`Strength ${index + 1}`}
                  value={strength}
                  onChange={(e) => {
                    const newStrengths = [...(legacyFormData.strengths || [])]
                    newStrengths[index] = e.target.value
                    setLegacyFormData((prev: Partial<PerformanceReviewForm>) => ({ ...prev, strengths: newStrengths }))
                  }}
                  sx={{ mb: 2 }}
                />
              ))}
              <Button
                onClick={() => setLegacyFormData((prev: Partial<PerformanceReviewForm>) => ({
                  ...prev,
                  strengths: [...(prev.strengths || []), ""]
                }))}
              >
                Add Strength
              </Button>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Areas for Improvement
              </Typography>
              {legacyFormData.areasForImprovement?.map((improvement: string, index: number) => (
                <TextField
                  key={index}
                  fullWidth
                  multiline
                  rows={2}
                  label={`Area for Improvement ${index + 1}`}
                  value={improvement}
                  onChange={(e) => {
                    const newImprovements = [...(legacyFormData.areasForImprovement || [])]
                    newImprovements[index] = e.target.value
                    setLegacyFormData((prev: Partial<PerformanceReviewForm>) => ({ ...prev, areasForImprovement: newImprovements }))
                  }}
                  sx={{ mb: 2 }}
                />
              ))}
              <Button
                onClick={() => setLegacyFormData((prev: Partial<PerformanceReviewForm>) => ({
                  ...prev,
                  areasForImprovement: [...(prev.areasForImprovement || []), ""]
                }))}
              >
                Add Area for Improvement
              </Button>
            </TabPanel>

            <TabPanel value={legacyDialogTab} index={3}>
              <Typography variant="h6" gutterBottom>
                Goals
              </Typography>
              {legacyFormData.goals?.map((goal: any, index: number) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Goal Description"
                          value={goal.description}
                          onChange={(e) => {
                            const newGoals = [...(legacyFormData.goals || [])]
                            newGoals[index] = { ...goal, description: e.target.value }
                            setLegacyFormData(prev => ({ ...prev, goals: newGoals }))
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <DatePicker
                          label="Target Date"
                          value={goal.targetDate ? new Date(goal.targetDate) : null}
                          onChange={(date) => {
                            const newGoals = [...(legacyFormData.goals || [])]
                            newGoals[index] = { ...goal, targetDate: date?.toISOString() || "" }
                            setLegacyFormData(prev => ({ ...prev, goals: newGoals }))
                          }}
                          slotProps={{ textField: { fullWidth: true } }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Status</InputLabel>
                          <Select
                            value={goal.status}
                            onChange={(e) => {
                              const newGoals = [...(legacyFormData.goals || [])]
                              newGoals[index] = { ...goal, status: e.target.value }
                              setLegacyFormData(prev => ({ ...prev, goals: newGoals }))
                            }}
                            label="Status"
                          >
                            <MenuItem value="Not Started">Not Started</MenuItem>
                            <MenuItem value="In Progress">In Progress</MenuItem>
                            <MenuItem value="Completed">Completed</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
              <Button
                onClick={() => setLegacyFormData((prev: Partial<PerformanceReviewForm>) => ({
                  ...prev,
                  goals: [...(prev.goals || []), { description: "", status: "not_started" }]
                }))}
              >
                Add Goal
              </Button>
            </TabPanel>

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Additional Comments"
              value={legacyFormData.comments}
              onChange={(e) => setLegacyFormData((prev: Partial<PerformanceReviewForm>) => ({ ...prev, comments: e.target.value }))}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleLegacySave} variant="contained" disabled={loading || !canMutate}>
              Save
            </Button>
          </DialogActions>
        </Dialog>

        {/* Qualification Review Dialog */}
        <Dialog
          open={qualificationOpenDialog}
          onClose={() => setQualificationOpenDialog(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>Qualification-Based Performance Review</DialogTitle>
          <DialogContent>
            <Tabs value={qualificationDialogTab} onChange={(_, newValue) => setQualificationDialogTab(newValue)}>
              <Tab label="Basic Info" />
              <Tab label="Qualifications" />
              <Tab label="Feedback" />
              <Tab label="Goals" />
            </Tabs>

            <TabPanel value={qualificationDialogTab} index={0}>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Employee</InputLabel>
                    <Select
                      value={qualificationFormData.employeeId}
                      onChange={(e) => {
                        const employee = state.employees?.find((emp: any) => emp.id === e.target.value)
                        const lengthOfService = employee?.lengthOfService || 0
                        const bonusPercentage = Math.floor(lengthOfService / 12) * 2
                        setQualificationFormData(prev => ({
                          ...prev,
                          employeeId: e.target.value,
                          employeeName: employee ? `${employee.firstName} ${employee.lastName}` : "",
                          lengthOfServiceBonus: {
                            months: lengthOfService,
                            bonusPercentage,
                            applied: false
                          }
                        }))
                      }}
                      label="Employee"
                    >
                      {state.employees?.map((employee: any) => (
                        <MenuItem key={employee.id} value={employee.id}>
                          {`${employee.firstName} ${employee.lastName}`}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Reviewer Name"
                    value={qualificationFormData.reviewerName}
                    onChange={(e) => setQualificationFormData((prev: Partial<PerformanceReviewForm>) => ({ ...prev, reviewerName: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Review Type</InputLabel>
                    <Select
                      value={qualificationFormData.reviewType}
                      onChange={(e) => setQualificationFormData((prev: Partial<PerformanceReviewForm>) => ({ ...prev, reviewType: e.target.value }))}
                      label="Review Type"
                    >
                      <MenuItem value="Annual">Annual</MenuItem>
                      <MenuItem value="Probation">Probation</MenuItem>
                      <MenuItem value="Quarterly">Quarterly</MenuItem>
                      <MenuItem value="Mid-Year">Mid-Year</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={qualificationFormData.status}
                      onChange={(e) => setQualificationFormData((prev: Partial<PerformanceReviewForm>) => ({ ...prev, status: e.target.value }))}
                      label="Status"
                    >
                      <MenuItem value="Scheduled">Scheduled</MenuItem>
                      <MenuItem value="In Progress">In Progress</MenuItem>
                      <MenuItem value="Completed">Completed</MenuItem>
                      <MenuItem value="Overdue">Overdue</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DatePicker
                    label="Review Date"
                    value={qualificationFormData.reviewDate ? new Date(qualificationFormData.reviewDate) : null}
                    onChange={(date) => setQualificationFormData((prev: Partial<PerformanceReviewForm>) => ({ ...prev, reviewDate: date?.toISOString() || "" }))}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DatePicker
                    label="Due Date"
                    value={qualificationFormData.dueDate ? new Date(qualificationFormData.dueDate) : null}
                    onChange={(date) => setQualificationFormData((prev: Partial<PerformanceReviewForm>) => ({ ...prev, dueDate: date?.toISOString() || "" }))}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
              </Grid>

              {/* Length of Service Bonus Display */}
              <Card sx={{ mt: 3, bgcolor: "primary.50" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Length of Service Bonus
                  </Typography>
                  <Typography variant="body2">
                    Service Duration: {qualificationFormData.lengthOfServiceBonus?.months || 0} months
                  </Typography>
                  <Typography variant="body2">
                    Bonus Percentage: {qualificationFormData.lengthOfServiceBonus?.bonusPercentage || 0}% (2% per year)
                  </Typography>
                </CardContent>
              </Card>
            </TabPanel>

            <TabPanel value={qualificationDialogTab} index={1}>
              <Typography variant="h6" gutterBottom>
                Qualification Assessment
              </Typography>
              {qualificationFormData.qualificationAssessment?.map((qual: any, index: number) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      {qual.qualification}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Current Level</InputLabel>
                          <Select
                            value={qual.currentLevel}
                            onChange={(e) => {
                              const newAssessment = [...(qualificationFormData.qualificationAssessment || [])]
                              newAssessment[index] = { ...qual, currentLevel: e.target.value }
                              setQualificationFormData((prev: Partial<PerformanceReviewForm>) => ({ ...prev, qualificationAssessment: newAssessment }))
                            }}
                            label="Current Level"
                          >
                            {qualificationLevels.map(level => (
                              <MenuItem key={level.value} value={level.value}>
                                {level.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Target Level</InputLabel>
                          <Select
                            value={qual.targetLevel}
                            onChange={(e) => {
                              const newAssessment = [...(qualificationFormData.qualificationAssessment || [])]
                              newAssessment[index] = { ...qual, targetLevel: e.target.value }
                              setQualificationFormData((prev: Partial<PerformanceReviewForm>) => ({ ...prev, qualificationAssessment: newAssessment }))
                            }}
                            label="Target Level"
                          >
                            {qualificationLevels.map(level => (
                              <MenuItem key={level.value} value={level.value}>
                                {level.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          multiline
                          rows={3}
                          label="Development Plan"
                          value={qual.developmentPlan}
                          onChange={(e) => {
                            const newAssessment = [...(qualificationFormData.qualificationAssessment || [])]
                            newAssessment[index] = { ...qual, developmentPlan: e.target.value }
                            setQualificationFormData((prev: Partial<PerformanceReviewForm>) => ({ ...prev, qualificationAssessment: newAssessment }))
                          }}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </TabPanel>

            <TabPanel value={qualificationDialogTab} index={2}>
              <Typography variant="h6" gutterBottom>
                Strengths
              </Typography>
              {qualificationFormData.strengths?.map((strength: string, index: number) => (
                <TextField
                  key={index}
                  fullWidth
                  multiline
                  rows={2}
                  label={`Strength ${index + 1}`}
                  value={strength}
                  onChange={(e) => {
                    const newStrengths = [...(qualificationFormData.strengths || [])]
                    newStrengths[index] = e.target.value
                    setQualificationFormData((prev: Partial<PerformanceReviewForm>) => ({ ...prev, strengths: newStrengths }))
                  }}
                  sx={{ mb: 2 }}
                />
              ))}
              <Button
                onClick={() => setQualificationFormData(prev => ({
                  ...prev,
                  strengths: [...(prev.strengths || []), ""]
                }))}
              >
                Add Strength
              </Button>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Areas for Improvement
              </Typography>
              {qualificationFormData.areasForImprovement?.map((improvement: string, index: number) => (
                <TextField
                  key={index}
                  fullWidth
                  multiline
                  rows={2}
                  label={`Area for Improvement ${index + 1}`}
                  value={improvement}
                  onChange={(e) => {
                    const newImprovements = [...(qualificationFormData.areasForImprovement || [])]
                    newImprovements[index] = e.target.value
                    setQualificationFormData((prev: Partial<PerformanceReviewForm>) => ({ ...prev, areasForImprovement: newImprovements }))
                  }}
                  sx={{ mb: 2 }}
                />
              ))}
              <Button
                onClick={() => setQualificationFormData(prev => ({
                  ...prev,
                  areasForImprovement: [...(prev.areasForImprovement || []), ""]
                }))}
              >
                Add Area for Improvement
              </Button>
            </TabPanel>

            <TabPanel value={qualificationDialogTab} index={3}>
              <Typography variant="h6" gutterBottom>
                Goals
              </Typography>
              {qualificationFormData.goals?.map((goal: any, index: number) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Goal Description"
                          value={goal.description}
                          onChange={(e) => {
                            const newGoals = [...(qualificationFormData.goals || [])]
                            newGoals[index] = { ...goal, description: e.target.value }
                            setQualificationFormData((prev: Partial<PerformanceReviewForm>) => ({ ...prev, goals: newGoals }))
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <DatePicker
                          label="Target Date"
                          value={goal.targetDate ? new Date(goal.targetDate) : null}
                          onChange={(date) => {
                            const newGoals = [...(qualificationFormData.goals || [])]
                            newGoals[index] = { ...goal, targetDate: date?.toISOString() || "" }
                            setQualificationFormData((prev: Partial<PerformanceReviewForm>) => ({ ...prev, goals: newGoals }))
                          }}
                          slotProps={{ textField: { fullWidth: true } }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Status</InputLabel>
                          <Select
                            value={goal.status}
                            onChange={(e) => {
                              const newGoals = [...(qualificationFormData.goals || [])]
                              newGoals[index] = { ...goal, status: e.target.value }
                              setQualificationFormData((prev: Partial<PerformanceReviewForm>) => ({ ...prev, goals: newGoals }))
                            }}
                            label="Status"
                          >
                            <MenuItem value="not_started">Not Started</MenuItem>
                            <MenuItem value="in_progress">In Progress</MenuItem>
                            <MenuItem value="completed">Completed</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Reminder</InputLabel>
                          <Select
                            value={goal.reminder?.frequency || ''}
                            onChange={(e) => {
                              const newGoals = [...(qualificationFormData.goals || [])]
                              newGoals[index] = { ...goal, reminder: { ...(goal.reminder || {}), frequency: e.target.value } }
                              setQualificationFormData((prev: Partial<PerformanceReviewForm>) => ({ ...prev, goals: newGoals }))
                            }}
                            label="Reminder"
                          >
                            <MenuItem value="">No Reminders</MenuItem>
                            <MenuItem value="weekly">Weekly</MenuItem>
                            <MenuItem value="monthly">Monthly</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
              <Button
                onClick={() => setQualificationFormData((prev: Partial<PerformanceReviewForm>) => ({
                  ...prev,
                  goals: [...(prev.goals || []), { description: "", status: "not_started" }]
                }))}
              >
                Add Goal
              </Button>
            </TabPanel>

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Additional Comments"
              value={qualificationFormData.comments}
              onChange={(e) => setQualificationFormData((prev: Partial<PerformanceReviewForm>) => ({ ...prev, comments: e.target.value }))}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleQualificationSave} variant="contained" disabled={loading || !canMutate}>
              Save
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert onClose={handleSnackbarClose} severity={snackbar.severity}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>

      {/* New CRUD Modal */}
            <CRUDModal
        open={performanceCRUDModalOpen}
        onClose={(reason) => {
          setPerformanceCRUDModalOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            const __workspaceOnClose = handleClosePerformanceCRUD
            if (typeof __workspaceOnClose === "function") {
              __workspaceOnClose(reason)
            }
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "performanceReviewManagementModal1",
          crudMode,
          id: selectedPerformanceForCRUD?.id,
          itemLabel: selectedPerformanceForCRUD?.employeeName,
        }}
      >
        <PerformanceCRUDForm
          ref={performanceCRUDFormRef}
          performanceReview={selectedPerformanceForCRUD}
          mode={crudMode}
          onSave={handleSavePerformanceCRUD}
        />
      </CRUDModal>
    </LocalizationProvider>
  )
}

export default PerformanceReviewManagement
