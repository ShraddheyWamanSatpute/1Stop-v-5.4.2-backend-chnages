"use client"
import { useLocation } from "react-router-dom"

import { themeConfig } from "../../../theme/AppTheme";
import { alpha } from "@mui/material/styles";
import React, { useState, useEffect, useRef } from "react"
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Alert,
  Snackbar,
} from "@mui/material"
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Close as CloseIcon } from "@mui/icons-material"
import { useHR } from "../../../backend/context/HRContext"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import DataHeader from "../reusable/DataHeader"
import BenefitsCRUDForm, { type BenefitsCRUDFormHandle } from "./forms/BenefitsCRUDForm"
import { usePermission } from "../../hooks/usePermission"
import EmptyStateCard from "../reusable/EmptyStateCard"
// Company state is now handled through HRContext
import type { Benefit, EmployeeBenefit } from "../../../backend/interfaces/HRs"


const BenefitsManagement: React.FC = () => {
  const location = useLocation()
  const { state: hrState, fetchBenefits, fetchEmployeeBenefits, createBenefit, updateBenefit, deleteBenefit, assignBenefitToEmployee, updateEmployeeBenefit, removeEmployeeBenefit } = useHR()
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("hr", "benefits")
  const canRemove = canDelete("hr", "benefits")
  // Company state is now handled through HRContext

  // State
  const [tabValue, setTabValue] = useState(0)
  // Use benefits and employee benefits from HR context state instead of local state
  const benefits = hrState.benefits || []
  const employeeBenefits = hrState.employeeBenefits || []
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null)

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false)
  const [dialogType, setDialogType] = useState<"benefit" | "enrollment">("benefit")
  const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null)
  const [selectedEnrollment, setSelectedEnrollment] = useState<EmployeeBenefit | null>(null)

  // CRUD Modal state
  const [benefitsCRUDModalOpen, setBenefitsCRUDModalOpen] = useState(false)
  const [selectedBenefitForCRUD, setSelectedBenefitForCRUD] = useState<Benefit | null>(null)
  const [crudMode, setCrudMode] = useState<'create' | 'edit' | 'view'>('create')
  const benefitsCRUDFormRef = useRef<BenefitsCRUDFormHandle | null>(null)

  // DataHeader state
  const [searchTerm, setSearchTerm] = useState("")
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<string>("name")
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>("asc")

  // DataHeader configuration
  const filters = [
    {
      label: "Category",
      options: [
        { id: "health", name: "Health", color: "#4caf50" },
        { id: "dental", name: "Dental", color: "#2196f3" },
        { id: "vision", name: "Vision", color: themeConfig.colors.primary.light },
        { id: "retirement", name: "Retirement", color: "#ff9800" },
        { id: "life", name: "Life Insurance", color: "#f44336" },
        { id: "disability", name: "Disability", color: "#795548" },
        { id: "other", name: "Other", color: "#607d8b" },
      ],
      selectedValues: categoryFilter,
      onSelectionChange: setCategoryFilter,
    },
    {
      label: "Status",
      options: [
        { id: "active", name: "Active", color: "#4caf50" },
        { id: "inactive", name: "Inactive", color: "#9e9e9e" },
        { id: "pending", name: "Pending", color: "#ff9800" },
      ],
      selectedValues: statusFilter,
      onSelectionChange: setStatusFilter,
    },
  ]

  const sortOptions = [
    { value: "name", label: "Name" },
    { value: "category", label: "Category" },
    { value: "cost", label: "Cost" },
    { value: "status", label: "Status" },
  ]

  // DataHeader handlers
  const handleSortChange = (value: string, direction: "asc" | "desc") => {
    setSortBy(value)
    setSortDirection(direction)
  }


  // Filter and sort benefits
  const filteredBenefits = React.useMemo(() => {
    let filtered = benefits.filter((benefit) => {
      const matchesSearch = 
        searchTerm === "" ||
        benefit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        benefit.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (benefit.category && benefit.category.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesCategory = 
        categoryFilter.length === 0 || 
        categoryFilter.includes(benefit.category?.toLowerCase() || "")

      const matchesStatus = 
        statusFilter.length === 0 || 
        statusFilter.includes(benefit.status?.toLowerCase() || "")

      return matchesSearch && matchesCategory && matchesStatus
    })

    // Sort the filtered benefits
    filtered.sort((a, b) => {
      let aValue, bValue
      
      switch (sortBy) {
        case "category":
          aValue = a.category?.toLowerCase() || ""
          bValue = b.category?.toLowerCase() || ""
          break
        case "cost":
          aValue = a.cost?.employer || 0
          bValue = b.cost?.employer || 0
          break
        case "status":
          aValue = a.status?.toLowerCase() || ""
          bValue = b.status?.toLowerCase() || ""
          break
        case "name":
        default:
          aValue = a.name?.toLowerCase() || ""
          bValue = b.name?.toLowerCase() || ""
          break
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc" 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      } else {
        return sortDirection === "asc" 
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number)
      }
    })

    return filtered
  }, [benefits, searchTerm, categoryFilter, statusFilter, sortBy, sortDirection])

  const handleExportCSV = () => {
    const headers = [
      "Name",
      "Description",
      "Category",
      "Cost",
      "Status",
      "Coverage Details",
      "Eligibility Requirements",
      "Created Date",
    ]
    const csvContent = [
      headers.join(","),
      ...filteredBenefits.map((benefit) =>
        [
          `"${benefit.name}"`,
          `"${benefit.description.replace(/"/g, '""')}"`,
          benefit.category || "",
          benefit.cost?.toString() || "",
          benefit.status || "",
          `"${benefit.coverageDetails || ""}"`,
          `"${benefit.eligibilityRequirements || ""}"`,
          benefit.createdAt ? new Date(benefit.createdAt).toISOString().split('T')[0] : "",
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `benefits_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // CRUD handlers
  const handleOpenBenefitsCRUD = (benefit: Benefit | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    if ((mode === "create" || mode === "edit") && !canMutate) return
    setSelectedBenefitForCRUD(benefit)
    setCrudMode(mode)
    setBenefitsCRUDModalOpen(true)
  }

  const handleCloseBenefitsCRUD = () => {
    setBenefitsCRUDModalOpen(false)
    setSelectedBenefitForCRUD(null)
  }

  const handleSaveBenefitsCRUD = async (benefitData: any) => {
    if (!canMutate) return
    try {
      if (crudMode === 'create') {
        await createBenefit(benefitData)
        setNotification({ message: "Benefit created successfully", type: "success" })
        // Refresh data in background without blocking UI
        fetchBenefits().catch(err => console.error("Background refresh error:", err))
      } else if (crudMode === 'edit' && selectedBenefitForCRUD) {
        await updateBenefit(selectedBenefitForCRUD.id, benefitData)
        setNotification({ message: "Benefit updated successfully", type: "success" })
        // Refresh data in background without blocking UI
        fetchBenefits().catch(err => console.error("Background refresh error:", err))
      }
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "benefitsManagementModal1",
        crudMode,
        id: selectedBenefitForCRUD?.id ?? benefitData?.id,
        itemLabel: benefitData?.name,
      })
      handleCloseBenefitsCRUD()
    } catch (error) {
      console.error('Error saving benefit:', error)
      setNotification({ message: "Error saving benefit", type: "error" })
    }
  }

  // Form state
  const [benefitForm, setBenefitForm] = useState({
    name: "",
    description: "",
    provider: "",
    type: "health" as "health" | "dental" | "vision" | "life" | "retirement" | "pto" | "other",
    employerCost: "0",
    employeeCost: "0",
    frequency: "monthly" as "weekly" | "biweekly" | "monthly" | "annually",
    employmentType: "full_time" as "full_time" | "part_time" | "contract",
    waitingPeriod: "0",
    waitingPeriodUnit: "days" as "days" | "weeks" | "months",
    minimumHours: "0",
    active: true,
  })

  const [enrollmentForm, setEnrollmentForm] = useState({
    employeeId: "",
    benefitId: "",
    enrollmentDate: new Date().toISOString().split("T")[0],
    coverageLevel: "employee" as "employee" | "employee_spouse" | "employee_children" | "family",
    employeeContribution: "0",
    employerContribution: "0",
    status: "active" as "active" | "pending" | "terminated",
    notes: "",
  })

  // Data is loaded centrally by HRContext on HR entry.
  // Avoid fetching-on-navigation here; use explicit refresh actions instead.

  const loadBenefits = async () => {
    // Company state handled internally

    setLoading(true)
    try {
      await fetchBenefits()
      // Data is automatically updated in HR context state
      setError(null)
    } catch (err: any) {
      console.error("Error loading benefits:", err)
      setError(err.message || "Failed to load benefits")
    } finally {
      setLoading(false)
    }
  }

  const loadEmployeeBenefits = async () => {
    // Company state handled internally

    try {
      await fetchEmployeeBenefits(hrState.employees[0]?.id || "")
      // Data is automatically updated in HR context state
    } catch (err: any) {
      console.error("Error loading employee benefits:", err)
    }
  }


  const handleOpenDialog = (type: "benefit" | "enrollment", item?: Benefit | EmployeeBenefit) => {
    if (!canMutate) return
    setDialogType(type)

    if (type === "benefit") {
      const benefit = item as Benefit
      if (benefit) {
        setSelectedBenefit(benefit)
        setBenefitForm({
          name: benefit.name,
          description: benefit.description || "",
          provider: benefit.provider || "",
          type: benefit.type || "health",
          employerCost: benefit.cost?.employer.toString() || "0",
          employeeCost: benefit.cost?.employee.toString() || "0",
          frequency: benefit.cost?.frequency || "monthly",
          employmentType: benefit.eligibility?.employmentTypes[0] || "full_time",
          waitingPeriod: benefit.eligibility?.waitingPeriod?.toString() || "0",
          waitingPeriodUnit: benefit.eligibility?.waitingPeriodUnit || "days",
          minimumHours: benefit.eligibility?.minimumHours?.toString() || "0",
          active: benefit.active,
        })
      } else {
        setSelectedBenefit(null)
        setBenefitForm({
          name: "",
          description: "",
          provider: "",
          type: "health",
          employerCost: "0",
          employeeCost: "0",
          frequency: "monthly",
          employmentType: "full_time",
          waitingPeriod: "0",
          waitingPeriodUnit: "days",
          minimumHours: "0",
          active: true,
        })
      }
    } else {
      const enrollment = item as EmployeeBenefit
      if (enrollment) {
        setSelectedEnrollment(enrollment)
        setEnrollmentForm({
          employeeId: enrollment.employeeId,
          benefitId: enrollment.benefitId,
          enrollmentDate: new Date(enrollment.enrollmentDate).toISOString().split("T")[0],
          coverageLevel: enrollment.coverageLevel,
          employeeContribution: enrollment.employeeContribution.toString(),
          employerContribution: enrollment.employerContribution.toString(),
          status: enrollment.status,
          notes: enrollment.notes || "",
        })
      } else {
        setSelectedEnrollment(null)
        setEnrollmentForm({
          employeeId: "",
          benefitId: "",
          enrollmentDate: new Date().toISOString().split("T")[0],
          coverageLevel: "employee",
          employeeContribution: "0",
          employerContribution: "0",
          status: "active",
          notes: "",
        })
      }
    }

    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setSelectedBenefit(null)
    setSelectedEnrollment(null)
  }

  const handleSubmitBenefit = async () => {
    if (!canMutate) return
    if (!benefitForm.name) {
      setNotification({ message: "Benefit name is required", type: "error" })
      return
    }

    setLoading(true)
    try {
      const benefitData: Omit<Benefit, "id"> = {
        name: benefitForm.name,
        description: benefitForm.description,
        type: benefitForm.type,
        provider: benefitForm.provider || "",
        cost: {
          employer: Number(benefitForm.employerCost),
          employee: Number(benefitForm.employeeCost),
          frequency: benefitForm.frequency,
        },
        eligibility: {
          employmentTypes: [benefitForm.employmentType],
          waitingPeriod: Number(benefitForm.waitingPeriod),
          waitingPeriodUnit: benefitForm.waitingPeriodUnit,
          minimumHours: Number(benefitForm.minimumHours),
        },
        active: benefitForm.active,
        createdAt: Date.now(),
      }

      if (selectedBenefit) {
        await updateBenefit(selectedBenefit.id, benefitData)
        setNotification({ message: "Benefit updated successfully", type: "success" })
      } else {
        await createBenefit(benefitData)
        setNotification({ message: "Benefit added successfully", type: "success" })
      }

      handleCloseDialog()
      await loadBenefits()
      setError(null)
    } catch (error: any) {
      console.error("Error saving benefit:", error)
      setError(error.message || "Failed to save benefit")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitEnrollment = async () => {
    if (!canMutate) return
    if (!enrollmentForm.employeeId || !enrollmentForm.benefitId) {
      setNotification({ message: "Employee and benefit are required", type: "error" })
      return
    }

    setLoading(true)
    try {
      const enrollmentData: Omit<EmployeeBenefit, "id"> = {
        employeeId: enrollmentForm.employeeId,
        benefitId: enrollmentForm.benefitId,
        enrollmentDate: new Date(enrollmentForm.enrollmentDate).getTime(),
        coverageLevel: enrollmentForm.coverageLevel,
        employeeContribution: Number(enrollmentForm.employeeContribution),
        employerContribution: Number(enrollmentForm.employerContribution),
        status: enrollmentForm.status,
        notes: enrollmentForm.notes || "",
        createdAt: Date.now(),
      }

      if (selectedEnrollment) {
        await updateEmployeeBenefit(selectedEnrollment.id, enrollmentData)
        setNotification({ message: "Enrollment updated successfully", type: "success" })
      } else {
        await assignBenefitToEmployee(enrollmentData.employeeId, enrollmentData.benefitId, enrollmentData)
        setNotification({ message: "Enrollment added successfully", type: "success" })
      }

      handleCloseDialog()
      await loadEmployeeBenefits()
      setError(null)
    } catch (error: any) {
      console.error("Error saving enrollment:", error)
      setError(error.message || "Failed to save enrollment")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteBenefit = async (benefitId: string) => {
    if (!canRemove) return
    setLoading(true)
    try {
      await deleteBenefit(benefitId)
      setNotification({ message: "Benefit deleted successfully", type: "success" })
      await loadBenefits()
      setError(null)
    } catch (error: any) {
      console.error("Error deleting benefit:", error)
      setError(error.message || "Failed to delete benefit")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEnrollment = async (enrollmentId: string) => {
    if (!canRemove) return
    setLoading(true)
    try {
      await removeEmployeeBenefit(enrollmentId)
      setNotification({ message: "Enrollment deleted successfully", type: "success" })
      await loadEmployeeBenefits()
      setError(null)
    } catch (error: any) {
      console.error("Error deleting enrollment:", error)
      setError(error.message || "Failed to delete enrollment")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ p: 0 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <DataHeader
        onCreateNew={() => handleOpenBenefitsCRUD(null, 'create')}
        onExportCSV={handleExportCSV}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search benefits..."
        showDateControls={false}
        filters={filters}
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded(!filtersExpanded)}
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit benefits."
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
              Available Benefits ({benefits.length})
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
              Enrollments ({employeeBenefits.length})
            </Button>
          </Box>
        }
      />

      {tabValue === 0 && (
        <>
          {filteredBenefits.length === 0 ? (
          <EmptyStateCard
            icon={AddIcon}
            title={benefits.length === 0 ? "No benefits found" : "No benefits match your current filters"}
            description={benefits.length === 0 ? "Click 'Add Benefit' to create your first benefit." : "Try adjusting your search or filters."}
            cardSx={{ maxWidth: 560, mx: "auto", boxShadow: "none" }}
          />
        ) : (
          <Grid container spacing={3}>
            {filteredBenefits.map((benefit: Benefit) => (
              <Grid item xs={12} md={6} key={benefit.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <Typography variant="h6" gutterBottom>
                        {benefit.name}
                      </Typography>
                      <Box>
                        <IconButton size="small" onClick={() => handleOpenBenefitsCRUD(benefit, 'edit')} disabled={!canMutate}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteBenefit(benefit.id)} disabled={!canRemove}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {benefit.description || "No description provided."}
                    </Typography>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Provider: {benefit.provider || "Not specified"}
                        </Typography>
                        {benefit.cost && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Cost: £{benefit.cost.employer.toFixed(2)} (employer) / £{benefit.cost.employee.toFixed(2)}{" "}
                            (employee)
                          </Typography>
                        )}
                        {benefit.eligibility && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Eligibility: {benefit.eligibility.minimumHours || 0} hrs/wk min • Wait {benefit.eligibility.waitingPeriod} {benefit.eligibility.waitingPeriodUnit}
                          </Typography>
                        )}
                      </Box>
                      <Chip
                        label={benefit.active ? "Active" : "Inactive"}
                        size="small"
                        color={benefit.active ? "success" : "default"}
                      />
                    </Box>
                    {Array.isArray(benefit.links) && benefit.links.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Button size="small" href={benefit.links[0].url} target="_blank" rel="noopener noreferrer">More Info</Button>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
        </>
      )}

      {tabValue === 1 && (
        <>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog("enrollment")} disabled={!canMutate}>
            Add Enrollment
          </Button>
        </Box>

        {employeeBenefits.length === 0 ? (
          <EmptyStateCard
            icon={AddIcon}
            title="No enrollments found"
            description='Click "Add Enrollment" to enroll an employee in a benefit.'
            cardSx={{ maxWidth: 560, mx: "auto", boxShadow: "none" }}
          />
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Benefit</TableCell>
                  <TableCell>Enrollment Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {employeeBenefits.map((enrollment: EmployeeBenefit) => {
                  const employee = hrState.employees.find((e) => e.id === enrollment.employeeId)
                  const benefit = benefits.find((b) => b.id === enrollment.benefitId)

                  return (
                    <TableRow key={enrollment.id}>
                      <TableCell>
                        {employee ? `${employee.firstName} ${employee.lastName}` : enrollment.employeeId}
                      </TableCell>
                      <TableCell>{benefit?.name || enrollment.benefitId}</TableCell>
                      <TableCell>{new Date(enrollment.enrollmentDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Chip
                          label={enrollment.status}
                          size="small"
                          color={enrollment.status === "active" ? "success" : "default"}
                        />
                      </TableCell>
                      <TableCell>{enrollment.notes || "-"}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleOpenDialog("enrollment", enrollment)} disabled={!canMutate}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteEnrollment(enrollment.id)} disabled={!canRemove}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        </>
      )}

      {/* Add/Edit Benefit Dialog */}
      <Dialog open={openDialog && dialogType === "benefit"} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">{selectedBenefit ? "Edit Benefit" : "Add New Benefit"}</Typography>
            <IconButton onClick={handleCloseDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Benefit Name"
                value={benefitForm.name}
                onChange={(e) => setBenefitForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={benefitForm.description}
                onChange={(e) => setBenefitForm((prev) => ({ ...prev, description: e.target.value }))}
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Provider"
                value={benefitForm.provider}
                onChange={(e) => setBenefitForm((prev) => ({ ...prev, provider: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Benefit Type</InputLabel>
                <Select
                  value={benefitForm.type}
                  onChange={(e) => setBenefitForm((prev) => ({ ...prev, type: e.target.value as any }))}
                  label="Benefit Type"
                >
                  <MenuItem value="health">Health Insurance</MenuItem>
                  <MenuItem value="dental">Dental Insurance</MenuItem>
                  <MenuItem value="vision">Vision Insurance</MenuItem>
                  <MenuItem value="life">Life Insurance</MenuItem>
                  <MenuItem value="retirement">Retirement Plan</MenuItem>
                  <MenuItem value="pto">Paid Time Off</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Frequency</InputLabel>
                <Select
                  value={benefitForm.frequency}
                  onChange={(e) => setBenefitForm((prev) => ({ ...prev, frequency: e.target.value as any }))}
                  label="Frequency"
                >
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="biweekly">Bi-weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="annually">Annually</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Employer Cost"
                type="number"
                value={benefitForm.employerCost}
                onChange={(e) => setBenefitForm((prev) => ({ ...prev, employerCost: e.target.value }))}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>£</Typography>,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Employee Cost"
                type="number"
                value={benefitForm.employeeCost}
                onChange={(e) => setBenefitForm((prev) => ({ ...prev, employeeCost: e.target.value }))}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>£</Typography>,
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Employment Type</InputLabel>
                <Select
                  value={benefitForm.employmentType}
                  onChange={(e) => setBenefitForm((prev) => ({ ...prev, employmentType: e.target.value as any }))}
                  label="Employment Type"
                >
                  <MenuItem value="full_time">Full-Time</MenuItem>
                  <MenuItem value="part_time">Part-Time</MenuItem>
                  <MenuItem value="contract">Contract</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Waiting Period"
                type="number"
                value={benefitForm.waitingPeriod}
                onChange={(e) => setBenefitForm((prev) => ({ ...prev, waitingPeriod: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Waiting Period Unit</InputLabel>
                <Select
                  value={benefitForm.waitingPeriodUnit}
                  onChange={(e) => setBenefitForm((prev) => ({ ...prev, waitingPeriodUnit: e.target.value as any }))}
                  label="Waiting Period Unit"
                >
                  <MenuItem value="days">Days</MenuItem>
                  <MenuItem value="weeks">Weeks</MenuItem>
                  <MenuItem value="months">Months</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Minimum Hours"
                type="number"
                value={benefitForm.minimumHours}
                onChange={(e) => setBenefitForm((prev) => ({ ...prev, minimumHours: e.target.value }))}
                helperText="Minimum hours per week required for eligibility"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" color="primary" onClick={handleSubmitBenefit}>
            {selectedBenefit ? "Update Benefit" : "Add Benefit"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Enrollment Dialog */}
      <Dialog open={openDialog && dialogType === "enrollment"} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">{selectedEnrollment ? "Edit Enrollment" : "Add Benefit Enrollment"}</Typography>
            <IconButton onClick={handleCloseDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Employee</InputLabel>
                <Select
                  value={enrollmentForm.employeeId}
                  onChange={(e) => setEnrollmentForm((prev) => ({ ...prev, employeeId: e.target.value }))}
                  label="Employee"
                >
                  {hrState.employees.map((employee) => (
                    <MenuItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Benefit</InputLabel>
                <Select
                  value={enrollmentForm.benefitId}
                  onChange={(e) => setEnrollmentForm((prev) => ({ ...prev, benefitId: e.target.value }))}
                  label="Benefit"
                >
                  {benefits.map((benefit: Benefit) => (
                    <MenuItem key={benefit.id} value={benefit.id}>
                      {benefit.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Enrollment Date"
                type="date"
                value={enrollmentForm.enrollmentDate}
                onChange={(e) => setEnrollmentForm((prev) => ({ ...prev, enrollmentDate: e.target.value }))}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Coverage Level</InputLabel>
                <Select
                  value={enrollmentForm.coverageLevel}
                  onChange={(e) => setEnrollmentForm((prev) => ({ ...prev, coverageLevel: e.target.value as any }))}
                  label="Coverage Level"
                >
                  <MenuItem value="employee">Employee Only</MenuItem>
                  <MenuItem value="employee_spouse">Employee + Spouse</MenuItem>
                  <MenuItem value="employee_children">Employee + Children</MenuItem>
                  <MenuItem value="family">Family</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Employee Contribution"
                type="number"
                value={enrollmentForm.employeeContribution}
                onChange={(e) => setEnrollmentForm((prev) => ({ ...prev, employeeContribution: e.target.value }))}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>£</Typography>,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Employer Contribution"
                type="number"
                value={enrollmentForm.employerContribution}
                onChange={(e) => setEnrollmentForm((prev) => ({ ...prev, employerContribution: e.target.value }))}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>£</Typography>,
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                value={enrollmentForm.notes}
                onChange={(e) => setEnrollmentForm((prev) => ({ ...prev, notes: e.target.value }))}
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" color="primary" onClick={handleSubmitEnrollment} disabled={!canMutate}>
            {selectedEnrollment ? "Update Enrollment" : "Add Enrollment"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification */}
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

      {/* CRUD Modal */}
      <CRUDModal
        open={benefitsCRUDModalOpen}
        onClose={(reason) => {
          setBenefitsCRUDModalOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setSelectedBenefitForCRUD(null)
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "benefitsManagementModal1",
          crudMode,
          id: selectedBenefitForCRUD?.id,
          itemLabel: selectedBenefitForCRUD?.name,
        }}
        title={crudMode === "create" ? "Add Benefit" : crudMode === "edit" ? "Edit Benefit" : "View Benefit"}
        mode={crudMode}
        onEdit={() => setCrudMode("edit")}
        onSave={crudMode !== "view" ? handleSaveBenefitsCRUD : undefined}
        maxWidth="md"
        formRef={benefitsCRUDFormRef}
        cancelButtonText={undefined}
        hideCloseButton={true}
        hideCloseAction={true}
        disabled={(crudMode === "create" || crudMode === "edit") && !canMutate}
      >
        <BenefitsCRUDForm
          ref={benefitsCRUDFormRef}
          benefitPackage={selectedBenefitForCRUD as any}
          mode={crudMode}
          onSave={handleSaveBenefitsCRUD}
        />
      </CRUDModal>
    </Box>
  )
}

export default BenefitsManagement
