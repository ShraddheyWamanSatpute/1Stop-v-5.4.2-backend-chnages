"use client"
import { useLocation } from "react-router-dom"

import React, { useEffect, useRef, useState } from "react"
import {
  Box,
  Typography,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Alert,
  Snackbar,
  Paper,
} from "@mui/material"
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Notifications as NotificationsIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Flag as FlagIcon,
} from "@mui/icons-material"
import { useHR } from "../../../backend/context/HRContext"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import DataHeader from "../reusable/DataHeader"
import AnnouncementCRUDForm, { type AnnouncementCRUDFormHandle } from "./forms/AnnouncementCRUDForm"
import EmptyStateCard from "../reusable/EmptyStateCard"
import { usePermission } from "../../hooks/usePermission"
import { useSettings } from "../../../backend/context/SettingsContext"
import { THEME_COLORS } from "../../styles/themeColors"
// Company state is now handled through HRContext
import { Announcement } from '../../../backend/interfaces/HRs'
import { useTheme } from "@mui/material/styles"
import { useCompany } from "../../../backend/context/CompanyContext"

// Local interface for form data that maps to the canonical Announcement interface
interface AnnouncementFormData {
  title: string
  content: string
  date: string
  time: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  audience: 'All' | 'Department' | 'Location' | 'Role'
  audienceTarget?: string
  expiryDate: string
  sendEmail: boolean
}

// Helper function to get the appropriate icon based on announcement priority
const getAnnouncementIcon = (priority: string | undefined) => {
  switch (priority?.toLowerCase()) {
    case "low":
      return <InfoIcon color="info" />
    case "medium":
      return <InfoIcon color="primary" />
    case "high":
      return <WarningIcon color="warning" />
    case "urgent":
      return <FlagIcon color="error" />
    default:
      return <NotificationsIcon color="action" />
  }
}

// Helper function to get priority chip
const getPriorityChip = (priority: string) => {
  switch (priority.toLowerCase()) {
    case "low":
      return <Chip size="small" label="Low" color="primary" variant="outlined" />
    case "medium":
      return <Chip size="small" label="Medium" color="info" />
    case "high":
      return <Chip size="small" label="High" color="warning" />
    case "urgent":
      return <Chip size="small" label="Urgent" color="error" />
    default:
      return <Chip size="small" label="Medium" color="info" />
  }
}

const AnnouncementsManagement: React.FC = () => {
  const location = useLocation()
  // Use Material-UI's useTheme hook to access the theme
  const theme = useTheme()
  
  // Company state is now handled through HRContext
  const { state: hrState, refreshAnnouncements, addAnnouncement, updateAnnouncement, deleteAnnouncement } = useHR()
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("hr", "announcements")
  const canRemove = canDelete("hr", "announcements")
  const { state: settingsState } = useSettings()
  const { state: companyState } = useCompany()
  
  const [openForm, setOpenForm] = useState(false)
  // Use announcements from HR context instead of local state
  const announcements = hrState.announcements || []
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null)

  const [roles, setRoles] = useState<any[]>([])

  // Search and filter state - moved to top to avoid initialization issues
  const [searchTerm, setSearchTerm] = useState('')
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [priorityFilter, setPriorityFilter] = useState<string[]>([])
  const [audienceFilter, setAudienceFilter] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<string>("date")
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>("desc")

  const [formData, setFormData] = useState<AnnouncementFormData>({
    title: "",
    content: "",
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().slice(0, 5),
    priority: "medium",
    audience: "All",
    audienceTarget: undefined,
    expiryDate: "",
    sendEmail: false,
  })

  // CRUD Modal state
  const [announcementCRUDModalOpen, setAnnouncementCRUDModalOpen] = useState(false)
  const [selectedAnnouncementForCRUD, setSelectedAnnouncementForCRUD] = useState<Announcement | null>(null)
  const [crudMode, setCrudMode] = useState<'create' | 'edit' | 'view'>('create')
  const announcementCRUDFormRef = useRef<AnnouncementCRUDFormHandle | null>(null)

  // CRUD handlers
  const handleOpenAnnouncementCRUD = (announcement: Announcement | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    if ((mode === "create" || mode === "edit") && !canMutate) return
    setSelectedAnnouncementForCRUD(announcement)
    setCrudMode(mode)
    setAnnouncementCRUDModalOpen(true)
  }

  const handleCloseAnnouncementCRUD = () => {
    setAnnouncementCRUDModalOpen(false)
    setSelectedAnnouncementForCRUD(null)
  }

  const handleSaveAnnouncementCRUD = async (announcementData: any) => {
    if (!canMutate) return
    try {
      if (crudMode === 'create') {
        await addAnnouncement(announcementData)
        setNotification({ message: "Announcement created successfully", type: "success" })
        // Refresh data in background without blocking UI
        refreshAnnouncements().catch(err => console.error("Background refresh error:", err))
      } else if (crudMode === 'edit' && selectedAnnouncementForCRUD) {
        await updateAnnouncement(selectedAnnouncementForCRUD.id, announcementData)
        setNotification({ message: "Announcement updated successfully", type: "success" })
        // Refresh data in background without blocking UI
        refreshAnnouncements().catch(err => console.error("Background refresh error:", err))
      }
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "announcementsManagementModal1",
        crudMode,
        id: selectedAnnouncementForCRUD?.id ?? announcementData?.id,
        itemLabel: announcementData?.title ?? selectedAnnouncementForCRUD?.title,
      })
      handleCloseAnnouncementCRUD()
    } catch (error) {
      console.error('Error saving announcement:', error)
      setNotification({ message: "Error saving announcement", type: "error" })
    }
  }

  useEffect(() => {
    // Use roles directly from hrState instead of fetching them separately
    if (hrState.roles && hrState.roles.length > 0) {
      setRoles(hrState.roles)
    }
  }, [hrState.roles])


  // Data is loaded centrally by HRContext on HR entry.
  // Avoid fetching-on-navigation here; use explicit refresh actions instead.

  const handleOpenForm = (announcement?: Announcement) => {
    if (!canMutate) return
    if (announcement) {
      setSelectedAnnouncement(announcement)
      // Convert from Announcement to AnnouncementFormData
      setFormData({
        title: announcement.title,
        content: announcement.content,
        date: new Date(announcement.publishDate).toISOString().split('T')[0],
        time: new Date(announcement.publishDate).toTimeString().slice(0, 5),
        priority: announcement.priority,
        audience: announcement.audience,
        audienceTarget: announcement.audienceTarget,
        expiryDate: announcement.expiryDate ? new Date(announcement.expiryDate).toISOString().split('T')[0] : '',
        sendEmail: false,
      })
    } else {
      setSelectedAnnouncement(null)
      setFormData({
        title: '',
        content: '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5),
        priority: 'medium',
        audience: 'All',
        audienceTarget: '',
        expiryDate: '',
        sendEmail: false,
      })
    }
    setOpenForm(true)
  }

  const handleCloseForm = () => {
    setOpenForm(false)
    setSelectedAnnouncement(null)
  }

  const handleSaveAnnouncement = async () => {
    if (!canMutate) return
    // Company state is now handled internally by HRContext
    setLoading(true)
    try {
      // Convert form data to match Announcement interface
      const dateObj = new Date(`${formData.date}T${formData.time}`)
      const announcementData: Omit<Announcement, 'id'> = {
        title: formData.title,
        content: formData.content,
        publishDate: dateObj.getTime(),
        expiryDate: formData.expiryDate ? new Date(formData.expiryDate).getTime() : undefined,
        priority: formData.priority,
        audience: formData.audience,
        audienceTarget: formData.audienceTarget,
        author: settingsState.auth?.displayName || 'System User',
        readBy: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      if (selectedAnnouncement) {
        await updateAnnouncement(selectedAnnouncement.id, announcementData)
        setNotification({ message: "Announcement updated successfully", type: "success" })
      } else {
        await addAnnouncement(announcementData)
        setNotification({ message: "Announcement created successfully", type: "success" })
      }

      handleCloseForm()
      await refreshAnnouncements()
    } catch (error) {
      console.error("Error saving announcement:", error)
      setNotification({ message: "Error saving announcement", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!canRemove) return
    // Company state is now handled internally by HRContext
    setLoading(true)
    try {
      await deleteAnnouncement(announcementId)
      setNotification({ message: "Announcement deleted successfully", type: "success" })
      await refreshAnnouncements()
    } catch (error) {
      console.error("Error deleting announcement:", error)
      setNotification({ message: "Error deleting announcement", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort announcements
  const filteredAnnouncements = React.useMemo(() => {
    let filtered = announcements.filter((announcement) => {
      const matchesSearch = 
        searchTerm === "" ||
        announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        announcement.content.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesPriority = 
        priorityFilter.length === 0 || 
        priorityFilter.includes(announcement.priority?.toLowerCase() || "")

      const matchesAudience = 
        audienceFilter.length === 0 || 
        audienceFilter.includes(announcement.audience?.toLowerCase() || "")

      return matchesSearch && matchesPriority && matchesAudience
    })

    // Sort the filtered announcements
    filtered.sort((a, b) => {
      let aValue, bValue
      
      switch (sortBy) {
        case "title":
          aValue = a.title?.toLowerCase() || ""
          bValue = b.title?.toLowerCase() || ""
          break
        case "priority":
          aValue = a.priority?.toLowerCase() || ""
          bValue = b.priority?.toLowerCase() || ""
          break
        case "audience":
          aValue = a.audience?.toLowerCase() || ""
          bValue = b.audience?.toLowerCase() || ""
          break
        case "date":
        default:
          aValue = a.date ? new Date(a.date).getTime() : 0
          bValue = b.date ? new Date(b.date).getTime() : 0
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
  }, [announcements, searchTerm, priorityFilter, audienceFilter, sortBy, sortDirection])

  const handleExportCSV = () => {
    const headers = [
      "Title",
      "Content",
      "Priority",
      "Audience",
      "Audience Target",
      "Date",
      "Time",
      "Expiry Date",
      "Send Email",
    ]
    const csvContent = [
      headers.join(","),
      ...filteredAnnouncements.map((announcement) =>
        [
          `"${announcement.title}"`,
          `"${announcement.content.replace(/"/g, '""')}"`,
          announcement.priority || "",
          announcement.audience || "",
          `"${announcement.audienceTarget || ""}"`,
          announcement.date || "",
          announcement.time || "",
          announcement.expiryDate || "",
          announcement.sendEmail ? "Yes" : "No",
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `announcements_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // DataHeader configuration
  const filters = [
    {
      label: "Priority",
      options: [
        { id: "low", name: "Low", color: THEME_COLORS.lightBlue },
        { id: "medium", name: "Medium", color: THEME_COLORS.success },
        { id: "high", name: "High", color: THEME_COLORS.warning },
        { id: "urgent", name: "Urgent", color: THEME_COLORS.error },
      ],
      selectedValues: priorityFilter,
      onSelectionChange: setPriorityFilter,
    },
    {
      label: "Audience",
      options: [
        { id: "all", name: "All", color: THEME_COLORS.lightBlue },
        { id: "department", name: "Department", color: THEME_COLORS.success },
        { id: "location", name: "Location", color: THEME_COLORS.warning },
        { id: "role", name: "Role", color: THEME_COLORS.navy },
      ],
      selectedValues: audienceFilter,
      onSelectionChange: setAudienceFilter,
    },
  ]

  const sortOptions = [
    { value: "date", label: "Date" },
    { value: "title", label: "Title" },
    { value: "priority", label: "Priority" },
    { value: "audience", label: "Audience" },
  ]

  // DataHeader handlers
  const handleSortChange = (value: string, direction: "asc" | "desc") => {
    setSortBy(value)
    setSortDirection(direction)
  }


  // Removed duplicate getAnnouncementIcon function

  return (
    <Box sx={{ p: 0 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <DataHeader
        onCreateNew={() => handleOpenAnnouncementCRUD(null, 'create')}
        onExportCSV={handleExportCSV}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search announcements..."
        showDateControls={false}
        filters={filters}
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded(!filtersExpanded)}
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit announcements."
      />

      {filteredAnnouncements.length === 0 ? (
        <EmptyStateCard
          icon={NotificationsIcon}
          title={announcements.length === 0 ? "No announcements yet" : "No announcements match your filters"}
          description={
            announcements.length === 0
              ? "Create your first announcement to communicate with your team."
              : "Try adjusting your search or filter criteria."
          }
          action={
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenForm()} disabled={!canMutate}>
              {announcements.length === 0 ? "Create First Announcement" : "Create New Announcement"}
            </Button>
          }
          cardSx={{ maxWidth: 560, mx: "auto", boxShadow: "none" }}
        />
      ) : (
        <Grid container spacing={2}>
          {filteredAnnouncements.map((announcement) => (
            <Grid item xs={12} sm={6} md={6} key={announcement.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2 }}>
                    <Box sx={{ mr: 2 }}>
                      {getAnnouncementIcon(announcement.priority)}
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" component="div">
                        {announcement.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(announcement.publishDate).toLocaleDateString()} • {announcement.audience === 'All' ? 'All Staff' : `${announcement.audience}: ${announcement.audienceTarget || ''}`}
                      </Typography>
                    </Box>
                    {getPriorityChip(announcement.priority)}
                  </Box>

                  <Typography variant="body2" paragraph>
                    {announcement.content}
                  </Typography>

                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mt: 2,
                    }}
                  >
                    <Button variant="contained" startIcon={<EditIcon />} onClick={() => handleOpenAnnouncementCRUD(announcement, 'edit')} disabled={!canMutate}>
                      Edit
                    </Button>
                    <Button variant="contained" startIcon={<DeleteIcon />} onClick={() => handleDeleteAnnouncement(announcement.id)} disabled={!canRemove}>
                      Delete
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Announcement Form Dialog */}
      <Dialog open={openForm} onClose={handleCloseForm} maxWidth="md" fullWidth>
        <DialogTitle>{selectedAnnouncement ? "Edit Announcement" : "Create New Announcement"}</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Title"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  required
                  size="small"
                  sx={{ fontFamily: theme.typography.fontFamily }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Content"
                  multiline
                  rows={4}
                  value={formData.content}
                  onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                  required
                  size="small"
                  sx={{ fontFamily: theme.typography.fontFamily }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Publish Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={formData.date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                  required
                  size="small"
                  sx={{ fontFamily: theme.typography.fontFamily }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Publish Time"
                  type="time"
                  InputLabelProps={{ shrink: true }}
                  value={formData.time}
                  onChange={(e) => setFormData((prev) => ({ ...prev, time: e.target.value }))}
                  required
                  size="small"
                  sx={{ fontFamily: theme.typography.fontFamily }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={formData.priority}
                    label="Priority"
                    onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' }))}
                    sx={{ fontFamily: theme.typography.fontFamily }}
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="urgent">Urgent</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Audience</InputLabel>
                  <Select
                    value={formData.audience}
                    label="Audience"
                    onChange={(e) => setFormData((prev) => ({ ...prev, audience: e.target.value as 'All' | 'Department' | 'Location' | 'Role' }))}
                    sx={{ fontFamily: theme.typography.fontFamily }}
                  >
                    <MenuItem value="All">All Staff</MenuItem>
                    <MenuItem value="Department">Department</MenuItem>
                    <MenuItem value="Location">Location</MenuItem>
                    <MenuItem value="Role">Role</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {formData.audience !== 'All' && (
                <Grid item xs={12}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Target</InputLabel>
                    <Select
                      value={formData.audienceTarget || ''}
                      label="Target"
                      onChange={(e) => setFormData((prev) => ({ ...prev, audienceTarget: e.target.value }))}
                      sx={{ fontFamily: theme.typography.fontFamily }}
                    >
                      {formData.audience === 'Role' && roles.map((role) => (
                        <MenuItem key={role.id} value={role.id}>{role.label || role.name}</MenuItem>
                      ))}
                      {/* Add other audience target options here when needed */}
                      {formData.audience !== 'Role' && (
                        <MenuItem value="placeholder">Select a {formData.audience.toLowerCase()}</MenuItem>
                      )}
                    </Select>
                  </FormControl>
                </Grid>
              )}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Expiry Date (optional)"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  margin="normal"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, expiryDate: e.target.value }))}
                  size="small"
                  sx={{ fontFamily: theme.typography.fontFamily }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.sendEmail}
                      onChange={(e) => setFormData((prev) => ({ ...prev, sendEmail: e.target.checked }))}
                    />
                  }
                  label="Send email notification to all affected staff"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={handleSaveAnnouncement} disabled={loading || !canMutate}>
            {selectedAnnouncement ? "Update Announcement" : "Create Announcement"}
          </Button>
        </DialogActions>
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

      {/* CRUD Modal */}
      <CRUDModal
        open={announcementCRUDModalOpen}
        onClose={(reason) => {
          setAnnouncementCRUDModalOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setSelectedAnnouncementForCRUD(null)
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "announcementsManagementModal1",
          crudMode,
          id: selectedAnnouncementForCRUD?.id,
          itemLabel: selectedAnnouncementForCRUD?.title,
        }}
        title={
          crudMode === "create"
            ? "Create Announcement"
            : crudMode === "edit"
              ? "Edit Announcement"
              : "View Announcement"
        }
        mode={crudMode}
        onEdit={() => setCrudMode("edit")}
        onSave={crudMode !== "view" ? handleSaveAnnouncementCRUD : undefined}
        maxWidth="md"
        formRef={announcementCRUDFormRef}
        cancelButtonText={undefined}
        hideCloseButton={true}
        hideCloseAction={true}
        disabled={(crudMode === "create" || crudMode === "edit") && !canMutate}
      >
        <AnnouncementCRUDForm
          ref={announcementCRUDFormRef}
          announcement={selectedAnnouncementForCRUD as any}
          mode={crudMode}
          onSave={handleSaveAnnouncementCRUD}
        />
      </CRUDModal>
    </Box>
  )
}

export default AnnouncementsManagement
