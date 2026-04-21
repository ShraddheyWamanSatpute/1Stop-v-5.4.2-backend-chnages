"use client"
import { useLocation } from "react-router-dom"

import { themeConfig } from "../../../theme/AppTheme";
import { alpha } from "@mui/material/styles";
import type React from "react"
import { useMemo, useRef, useState, useEffect } from "react"
import { Box, Button, Card, CardContent, CardHeader, Grid, Paper, TextField, Typography, Chip, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem } from "@mui/material"
// Company state is now handled through HRContext
import { useHR } from "../../../backend/context/HRContext"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import DataHeader from "../reusable/DataHeader"
import RecruitmentCRUDForm, { type RecruitmentCRUDFormHandle } from "./forms/RecruitmentCRUDForm"
import { usePermission } from "../../hooks/usePermission"
// Functions now accessed through HRContext
import type { JobPosting, Candidate, ATSPipeline } from "../../../backend/interfaces/HRs"

const defaultPipeline: ATSPipeline = {
  id: "default",
  name: "Default Pipeline",
  stages: [
    { id: "applied", name: "Applied", order: 1, color: "#90caf9", isRequired: true, actions: [] },
    { id: "screening", name: "Screening", order: 2, color: "#a5d6a7", isRequired: false, actions: [] },
    { id: "interview", name: "Interview", order: 3, color: "#fff59d", isRequired: false, actions: [] },
    { id: "offer", name: "Offer", order: 4, color: "#ffcc80", isRequired: false, actions: [] },
    { id: "hired", name: "Hired", order: 5, color: "#ce93d8", isRequired: false, actions: [] },
  ],
  isDefault: true,
  createdAt: Date.now(),
}

const RecruitmentManagement: React.FC = () => {
  const location = useLocation()
  // Company state is now handled through HRContext
  const { state: hrState, refreshJobs, refreshCandidates, addJob, updateJob, deleteJob } = useHR()
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("hr", "recruitment")
  const canRemove = canDelete("hr", "recruitment")
  const [tab, setTab] = useState(0)
  // Use jobs and candidates from HR context state instead of local state
  const jobs = hrState.jobs || []
  const candidates = hrState.candidates || []
  const [pipeline] = useState<ATSPipeline>(defaultPipeline)
  const [openJobDialog, setOpenJobDialog] = useState(false)
  const [jobForm, setJobForm] = useState<Partial<JobPosting>>({ title: "", department: "", location: "", employmentType: "full_time", description: "", requirements: [], responsibilities: [], salaryRange: { min: 0, max: 0, currency: "GBP" }, benefits: [], status: "draft", postedDate: Date.now(), hiringManager: "" })

  // New CRUD Modal state
  const [recruitmentCRUDModalOpen, setRecruitmentCRUDModalOpen] = useState(false)
  const [selectedJobForCRUD, setSelectedJobForCRUD] = useState<JobPosting | null>(null)
  const [crudMode, setCrudMode] = useState<'create' | 'edit' | 'view'>('create')
  const recruitmentCRUDFormRef = useRef<RecruitmentCRUDFormHandle | null>(null)

  // Search and filter state - moved to top to avoid initialization issues
  const [searchTerm, setSearchTerm] = useState('')
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [departmentFilter, setDepartmentFilter] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<string>("postedDate")
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>("desc")

  // Data is loaded centrally by HRContext on HR entry.
  // Avoid fetching-on-navigation here; use explicit refresh actions instead.


  const saveJob = async () => {
    if (!canMutate) return
    try {
      await addJob(jobForm as Omit<JobPosting, "id">)
      setOpenJobDialog(false)
      // Data will be refreshed automatically by HRContext
    } catch (error) {
      console.error("Error creating job:", error)
    }
  }

  // New CRUD Modal handlers
  const handleOpenRecruitmentCRUD = (job: JobPosting | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    if ((mode === "create" || mode === "edit") && !canMutate) return
    setSelectedJobForCRUD(job)
    setCrudMode(mode)
    setRecruitmentCRUDModalOpen(true)
  }

  const handleCloseRecruitmentCRUD = () => {
    setRecruitmentCRUDModalOpen(false)
    setSelectedJobForCRUD(null)
    setCrudMode('create')
  }

  const handleSaveRecruitmentCRUD = async (jobData: any) => {
    if (!canMutate) return
    try {
      if (crudMode === 'create') {
        await addJob(jobData)
        // Refresh data in background without blocking UI
        refreshJobs().catch(err => console.error("Background refresh error:", err))
      } else if (crudMode === 'edit' && selectedJobForCRUD) {
        await updateJob(selectedJobForCRUD.id, jobData)
        // Refresh data in background without blocking UI
        refreshJobs().catch(err => console.error("Background refresh error:", err))
      }
      handleCloseRecruitmentCRUD()
    } catch (error) {
      console.error("Error saving job:", error)
    }
  }

  // Filter and sort jobs
  const filteredJobs = useMemo(() => {
    let filtered = jobs.filter((job) => {
      const matchesSearch = 
        searchTerm === "" ||
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.location.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = 
        statusFilter.length === 0 || 
        statusFilter.includes(job.status?.toLowerCase() || "")

      const matchesDepartment = 
        departmentFilter.length === 0 || 
        departmentFilter.includes(job.department)

      return matchesSearch && matchesStatus && matchesDepartment
    })

    // Sort the filtered jobs
    filtered.sort((a, b) => {
      let aValue, bValue
      
      switch (sortBy) {
        case "title":
          aValue = a.title?.toLowerCase() || ""
          bValue = b.title?.toLowerCase() || ""
          break
        case "department":
          aValue = a.department?.toLowerCase() || ""
          bValue = b.department?.toLowerCase() || ""
          break
        case "status":
          aValue = a.status?.toLowerCase() || ""
          bValue = b.status?.toLowerCase() || ""
          break
        case "salaryRange.min":
          aValue = a.salaryRange?.min || 0
          bValue = b.salaryRange?.min || 0
          break
        case "postedDate":
        default:
          aValue = a.postedDate ? new Date(a.postedDate).getTime() : 0
          bValue = b.postedDate ? new Date(b.postedDate).getTime() : 0
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
  }, [jobs, searchTerm, statusFilter, departmentFilter, sortBy, sortDirection])

  const handleExportCSV = () => {
    const headers = [
      "Title",
      "Department",
      "Location",
      "Employment Type",
      "Status",
      "Salary Min",
      "Salary Max",
      "Currency",
      "Posted Date",
      "Hiring Manager",
    ]
    const csvContent = [
      headers.join(","),
      ...filteredJobs.map((job) =>
        [
          `"${job.title}"`,
          `"${job.department}"`,
          `"${job.location}"`,
          job.employmentType || "",
          job.status || "",
          job.salaryRange?.min?.toString() || "",
          job.salaryRange?.max?.toString() || "",
          job.salaryRange?.currency || "",
          job.postedDate ? new Date(job.postedDate).toISOString().split('T')[0] : "",
          `"${job.hiringManager || ""}"`,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `job_postings_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // DataHeader configuration
  const filters = [
    {
      label: "Status",
      options: [
        { id: "draft", name: "Draft", color: "#9e9e9e" },
        { id: "published", name: "Published", color: "#4caf50" },
        { id: "closed", name: "Closed", color: "#f44336" },
        { id: "paused", name: "Paused", color: "#ff9800" },
      ],
      selectedValues: statusFilter,
      onSelectionChange: setStatusFilter,
    },
    {
      label: "Department",
      options: (hrState.departments || []).map(dept => ({ 
        id: dept.id, 
        name: dept.name,
        color: "#2196f3"
      })),
      selectedValues: departmentFilter,
      onSelectionChange: setDepartmentFilter,
    },
  ]

  const sortOptions = [
    { value: "postedDate", label: "Posted Date" },
    { value: "title", label: "Title" },
    { value: "department", label: "Department" },
    { value: "status", label: "Status" },
    { value: "salaryRange.min", label: "Salary (Low to High)" },
  ]

  // DataHeader handlers
  const handleSortChange = (value: string, direction: "asc" | "desc") => {
    setSortBy(value)
    setSortDirection(direction)
  }


  const stageToCandidates = useMemo(() => {
    const map: Record<string, Candidate[]> = {}
    pipeline.stages.forEach((s) => (map[s.id] = []))
    candidates.forEach((c) => {
      const s = c.status?.toLowerCase().replace(" ", "_") || "applied"
      if (!map[s]) map[s] = []
      map[s].push(c)
    })
    return map
  }, [candidates, pipeline.stages])

  return (
    <Box>
      <DataHeader
        onCreateNew={() => handleOpenRecruitmentCRUD(null, 'create')}
        onExportCSV={handleExportCSV}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search job postings..."
        showDateControls={false}
        filters={filters}
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded(!filtersExpanded)}
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit recruitment."
        additionalControls={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Button
              variant={tab === 0 ? "contained" : "outlined"}
              size="small"
              onClick={() => setTab(0)}
              sx={
                tab === 0
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
              Jobs ({filteredJobs.length})
            </Button>
            <Button
              variant={tab === 1 ? "contained" : "outlined"}
              size="small"
              onClick={() => setTab(1)}
              sx={
                tab === 1
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
              Pipeline ({candidates.length})
            </Button>
          </Box>
        }
      />

      {tab === 0 && (
        <Paper sx={{ p: 2 }}>
          <Grid container spacing={2}>
            {filteredJobs.map((j) => (
              <Grid item xs={12} md={6} key={j.id}>
                <Card>
                  <CardHeader title={j.title} subheader={`${j.department} • ${j.location}`} action={<Chip size="small" label={j.status} />} />
                  <CardContent>
                    <Typography variant="body2" sx={{ mb: 1 }}>{j.description}</Typography>
                    <Typography variant="caption">Salary: £{j.salaryRange.min} - £{j.salaryRange.max} {j.salaryRange.currency}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {tab === 1 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>Applicant Pipeline</Typography>
          <Grid container spacing={2}>
            {pipeline.stages.sort((a, b) => a.order - b.order).map((stage) => (
              <Grid item xs={12} md key={stage.id}>
                <Paper sx={{ p: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>{stage.name}</Typography>
                  {stageToCandidates[stage.id]?.map((c) => (
                    <Card key={c.id} sx={{ mb: 1 }}>
                      <CardContent>
                        <Typography variant="body2" fontWeight="bold">{c.firstName} {c.lastName}</Typography>
                        <Typography variant="caption" color="text.secondary">{c.email} • {c.phone}</Typography>
                      </CardContent>
                    </Card>
                  ))}
                  {stageToCandidates[stage.id]?.length === 0 && (
                    <Typography variant="caption" color="text.secondary">No candidates</Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      <Dialog open={openJobDialog} onClose={() => setOpenJobDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>New Job</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Title" value={jobForm.title || ""} onChange={(e) => setJobForm((p) => ({ ...p, title: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Department" value={jobForm.department || ""} onChange={(e) => setJobForm((p) => ({ ...p, department: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Location" value={jobForm.location || ""} onChange={(e) => setJobForm((p) => ({ ...p, location: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Employment Type</InputLabel>
                <Select value={(jobForm.employmentType as any) || "full_time"} label="Employment Type" onChange={(e) => setJobForm((p) => ({ ...p, employmentType: e.target.value as any }))}>
                  <MenuItem value="full_time">Full-time</MenuItem>
                  <MenuItem value="part_time">Part-time</MenuItem>
                  <MenuItem value="contract">Contract</MenuItem>
                  <MenuItem value="temporary">Temporary</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={4} label="Description" value={jobForm.description || ""} onChange={(e) => setJobForm((p) => ({ ...p, description: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={saveJob} disabled={!canMutate}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* New CRUD Modal */}
            <CRUDModal
        open={recruitmentCRUDModalOpen}
        onClose={(reason) => {
          setRecruitmentCRUDModalOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            const __workspaceOnClose = handleCloseRecruitmentCRUD
            if (typeof __workspaceOnClose === "function") {
              __workspaceOnClose(reason)
            }
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "recruitmentManagementModal1",
          crudMode,
          id: selectedJobForCRUD?.id,
          itemLabel: selectedJobForCRUD?.title,
        }}
      >
        <RecruitmentCRUDForm
          ref={recruitmentCRUDFormRef}
          jobPosting={selectedJobForCRUD as any}
          mode={crudMode}
          onSave={handleSaveRecruitmentCRUD}
        />
      </CRUDModal>
    </Box>
  )
}

export default RecruitmentManagement


