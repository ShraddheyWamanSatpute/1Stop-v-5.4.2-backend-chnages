"use client"
import type React from "react"
import { useLocation } from "react-router-dom"
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Switch,
  ListItemIcon,
  Divider,
  Alert,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormGroup,
  Tabs,
  Tab,
  Stack,
  useTheme,
} from "@mui/material"
import { alpha } from "@mui/material/styles"
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Drafts as DraftIcon,
  CheckCircle as CheckCircleIcon,
  Archive as ArchiveIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Business as BusinessIcon,
  ExpandMore as ExpandMoreIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material"
import { useState, useEffect, useCallback, useMemo } from "react"
import { useCompany } from "../../../backend/context/CompanyContext"
import { useSettings } from "../../../backend/context/SettingsContext"
import { useHR } from "../../../backend/context/HRContext"
import { TimePicker } from "@mui/x-date-pickers"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { format } from "date-fns"
import DataHeader from "../../components/reusable/DataHeader"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../components/reusable/CRUDModal"
import RequireCompanyContext from "../../components/global/RequireCompanyContext"
import EmptyStateCard from "../../components/reusable/EmptyStateCard"
import { checklistIdsEqual, getChecklistWindowForChecklist } from "../../../backend/utils/checklistUtils"

// TODO: Move these types to appropriate context files
interface ChecklistItem {
  id: string
  title: string
  description?: string
  text?: string
  completed: boolean
  completedAt?: number
  completedBy?: string
  dueDate?: number
  priority: 'low' | 'medium' | 'high'
  assigneeId?: string
  assigneeName?: string
  type?: string
  validation?: any
  required?: boolean
  order?: number
  createdAt: number
  updatedAt: number
}

interface ChecklistSection {
  id: string
  title: string
  description?: string
  items: ChecklistItem[]
  order: number
  sectionType?: string
  createdAt: number
  updatedAt: number
}

interface ChecklistSchedule {
  id: string
  title: string
  description?: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  dayOfWeek?: number
  dayOfMonth?: number
  time: string
  isActive: boolean
  type?: string
  repeatDays?: any
  openingDay?: any
  closingDay?: any
  openingDate?: any
  closingDate?: any
  openingTime?: any
  closingTime?: any
  timezone?: any
  expireTime?: any
  startDate?: any
  createdAt: number
  updatedAt: number
}

interface CompanyChecklist {
  id: string
  title: string
  description?: string
  sections: ChecklistSection[]
  schedule?: ChecklistSchedule
  isActive: boolean
  companyId: string
  createdBy: string
  category?: string
  status?: 'active' | 'draft' | 'archived'
  isGlobalAccess?: boolean
  siteId?: string
  subsiteId?: string
  assignedTo?: string[]
  assignedToTeams?: any
  tracking?: any
  createdAt: number
  updatedAt: number
}

// Define types for form data
interface ChecklistFormData {
  title: string
  description: string
  sections: ChecklistSection[]
  isGlobalAccess: boolean
  siteId: string
  subsiteId?: string
  assignedSites: string[]
  assignedSubsites: string[]
  assignedTo: string[]
  assignedToTeams: string[]
  schedule: ChecklistSchedule
  status: "active" | "draft" | "archived"
  category: string
  tracking: {
    requireSignature: boolean
    requirePhotos: boolean
    requireNotes: boolean
    requireLocation: boolean
  }
}

interface FilterState {
  search: string
  category: string
  status: string
  scheduleType: string
  sortBy: string
  sortOrder: "asc" | "desc"
}

type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"

export type ChecklistsPageProps = {
  /** When true (ESS/Mobile shell), page chrome matches other mobile modules. */
  mobileESSLayout?: boolean
}

const ChecklistsPage: React.FC<ChecklistsPageProps> = ({ mobileESSLayout = false }) => {
  const location = useLocation()
  const theme = useTheme()
  const {
    state: companyState,
    fetchChecklists,
    createChecklistItem: createChecklist,
    updateChecklistItem: updateChecklist,
    deleteChecklistItem: deleteChecklist,
    getChecklistCompletions,
  } = useCompany()
  const { state: settingsState } = useSettings()
  const { state: hrState } = useHR()

  const userId = settingsState.auth?.uid || ""

  // State management
  const [checklists, setChecklists] = useState<CompanyChecklist[]>([])
  const [filteredChecklists, setFilteredChecklists] = useState<CompanyChecklist[]>([])
  const [completions, setCompletions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingChecklist, setEditingChecklist] = useState<CompanyChecklist | null>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedChecklistId, setSelectedChecklistId] = useState<string>("")
  const [modalTab, setModalTab] = useState<0 | 1>(0)
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null)

  // When the Dialog z-index is increased, portaled menus/poppers can render behind it.
  // Use disablePortal for dropdown menus within this modal.
  const selectMenuProps = useMemo(() => ({ disablePortal: true } as const), [])

  // Some theme combinations make "small" inputs feel too short.
  // Keep compact density but ensure consistent visual height.
  const fieldSx = useMemo(
    () => ({
      "& .MuiInputBase-root": { minHeight: 44 },
      "& .MuiInputBase-input": { py: 1.1 },
      "& .MuiSelect-select": { py: 1.1 },
    }),
    [],
  )

  // Selects are wrapped by OutlinedInput; enforce height at the control level too.
  const controlSx = useMemo(
    () => ({
      "& .MuiOutlinedInput-root": { minHeight: 44 },
      "& .MuiOutlinedInput-input": { py: 1.1 },
      "& .MuiSelect-select": { py: 1.1 },
    }),
    [],
  )

  // Filter and search state
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    category: "",
    status: "",
    scheduleType: "",
    sortBy: "title",
    sortOrder: "asc",
  })
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  const checklistSummary = useMemo(() => {
    const total = checklists.length
    const active = checklists.filter((c) => c.status === "active").length
    const draft = checklists.filter((c) => !c.status || c.status === "draft").length
    const archived = checklists.filter((c) => c.status === "archived").length
    return { total, active, draft, archived }
  }, [checklists])

  // Form data
  const [formData, setFormData] = useState<ChecklistFormData>({
    title: "",
    description: "",
    sections: [],
    isGlobalAccess: false,
    siteId: "",
    subsiteId: undefined,
    assignedSites: [],
    assignedSubsites: [],
    assignedTo: [],
    assignedToTeams: [],
    schedule: {
      id: `schedule_${Date.now()}`,
      title: "Default Schedule",
      description: "Default schedule for checklist",
      frequency: "daily" as const,
      time: "09:00",
      isActive: true,
      type: "once",
      repeatDays: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false,
      },
      openingDay: "monday",
      closingDay: "friday",
      openingDate: 1,
      closingDate: undefined,
      openingTime: "09:00",
      closingTime: "17:00",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      startDate: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    status: "draft",
    category: "",
    tracking: {
      requireSignature: false,
      requirePhotos: false,
      requireNotes: false,
      requireLocation: false,
    },
  })

  // Mock data for dropdowns
  const categories = ["Safety", "Maintenance", "Quality", "Operations", "Compliance", "Training"]

  // Load data when company, site, or subsite changes
  useEffect(() => {
    loadData()
  }, [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID])

  // Filter and sort checklists when filters change
  useEffect(() => {
    filterAndSortChecklists()
  }, [checklists, filters])

  const loadData = async () => {
    if (!companyState.companyID) return

    try {
      setLoading(true)
      const [checklistsData, completionsData] = await Promise.all([fetchChecklists(), getChecklistCompletions()])

      setChecklists(checklistsData || [])
      setCompletions(completionsData || [])
    } catch (error) {
      console.error("Error loading data:", error)
      setError("Failed to load checklists")
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortChecklists = useCallback(() => {
    let filtered = [...checklists]

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(
        (checklist) =>
          checklist.title.toLowerCase().includes(searchLower) ||
          checklist.description?.toLowerCase().includes(searchLower) ||
          checklist.category?.toLowerCase().includes(searchLower),
      )
    }

    // Apply category filter
    if (filters.category) {
      filtered = filtered.filter((checklist) => checklist.category === filters.category)
    }

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter((checklist) => checklist.status === filters.status)
    }

    // Apply schedule type filter
    if (filters.scheduleType) {
      filtered = filtered.filter((checklist) => String(checklist.schedule?.type || "") === filters.scheduleType)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (filters.sortBy) {
        case "title":
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
          break
        case "created":
          aValue = a.createdAt || 0
          bValue = b.createdAt || 0
          break
        case "updated":
          aValue = a.updatedAt || 0
          bValue = b.updatedAt || 0
          break
        case "category":
          aValue = a.category?.toLowerCase() || ""
          bValue = b.category?.toLowerCase() || ""
          break
        case "section":
          aValue = a.sections?.length || 0
          bValue = b.sections?.length || 0
          break
        case "open": {
          const aw = getChecklistWindowForChecklist(a)
          const bw = getChecklistWindowForChecklist(b)
          aValue = aw.openingAt?.getTime?.() ?? 0
          bValue = bw.openingAt?.getTime?.() ?? 0
          break
        }
        case "due": {
          const aw = getChecklistWindowForChecklist(a)
          const bw = getChecklistWindowForChecklist(b)
          aValue = aw.closingAt?.getTime?.() ?? 0
          bValue = bw.closingAt?.getTime?.() ?? 0
          break
        }
        case "expire": {
          const aw = getChecklistWindowForChecklist(a)
          const bw = getChecklistWindowForChecklist(b)
          aValue = aw.expireAt ? aw.expireAt.getTime() : Number.POSITIVE_INFINITY
          bValue = bw.expireAt ? bw.expireAt.getTime() : Number.POSITIVE_INFINITY
          break
        }
        default:
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
      }

      if (aValue < bValue) return filters.sortOrder === "asc" ? -1 : 1
      if (aValue > bValue) return filters.sortOrder === "asc" ? 1 : -1
      return 0
    })

    setFilteredChecklists(filtered)
  }, [checklists, filters])

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      sections: [],
      isGlobalAccess: false,
      siteId: "",
      subsiteId: undefined,
      assignedSites: [],
      assignedSubsites: [],
      schedule: {
        id: `schedule_${Date.now()}`,
        title: "Default Schedule",
        description: "Default schedule for checklist",
        frequency: "daily" as const,
        time: "09:00",
        isActive: true,
        type: "once",
        repeatDays: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false,
        },
        openingDay: "monday",
        closingDay: "friday",
        openingDate: 1,
        closingDate: undefined,
        openingTime: "09:00",
        closingTime: "17:00",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        startDate: undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      status: "draft",
      assignedTo: [],
      assignedToTeams: [],
      category: "",
      tracking: {
        requireSignature: false,
        requirePhotos: false,
        requireNotes: false,
        requireLocation: false,
      },
    })
    setEditingChecklist(null)
    setModalTab(0)
    setExpandedSectionId(null)
  }

  const handleOpenDialog = (checklist?: CompanyChecklist) => {
    if (checklist) {
      setEditingChecklist(checklist)
      loadChecklist(checklist)
    } else {
      resetForm()
    }
    // Prevent focus staying on the trigger while the Dialog opens (avoids aria-hidden warning in Chrome)
    try {
      ;(document.activeElement as HTMLElement | null)?.blur?.()
    } catch {}
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    resetForm()
  }

  const loadChecklist = (checklist: CompanyChecklist) => {
    let sections = checklist.sections || []
    if (!checklist.sections && (checklist as any).items) {
      sections = [
        {
          id: "default-section",
          title: "Default Section",
          description: "",
          items: (checklist as any).items || [],
          order: 0,
          sectionType: "standard",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]
    }

    setFormData({
      title: checklist.title || "",
      description: checklist.description || "",
      sections: sections,
      isGlobalAccess: checklist.isGlobalAccess || false,
      siteId: checklist.siteId || companyState.selectedSiteID || "",
      subsiteId: checklist.subsiteId || companyState.selectedSubsiteID || undefined,
      assignedSites: (checklist as any).assignedSites || [],
      assignedSubsites: (checklist as any).assignedSubsites || [],
      assignedTo: checklist.assignedTo || [],
      assignedToTeams: checklist.assignedToTeams || [],
      schedule: {
        id: checklist.schedule?.id || `schedule_${Date.now()}`,
        title: checklist.schedule?.title || "Default Schedule",
        description: checklist.schedule?.description || "Default schedule for checklist",
        frequency: checklist.schedule?.frequency || "daily" as const,
        time: checklist.schedule?.time || "09:00",
        isActive: checklist.schedule?.isActive ?? true,
        type: checklist.schedule?.type || "once",
        repeatDays: checklist.schedule?.repeatDays || {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false,
        },
        openingDay: checklist.schedule?.openingDay || "monday",
        closingDay: checklist.schedule?.closingDay || "friday",
        openingDate: checklist.schedule?.openingDate || 1,
        closingDate: checklist.schedule?.closingDate,
        openingTime: checklist.schedule?.openingTime || "09:00",
        closingTime: checklist.schedule?.closingTime || "17:00",
        timezone: checklist.schedule?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        expireTime: checklist.schedule?.expireTime || 24,
        startDate: checklist.schedule?.startDate,
        createdAt: checklist.schedule?.createdAt || Date.now(),
        updatedAt: checklist.schedule?.updatedAt || Date.now(),
      },
      status: checklist.status || "draft",
      category: checklist.category || "",
      tracking: checklist.tracking || {
        requireSignature: false,
        requirePhotos: false,
        requireNotes: false,
        requireLocation: false,
      },
    })
  }

  const handleSaveChecklist = async () => {
    if (!companyState.companyID) return

    try {
      setLoading(true)

      const items = formData.sections.flatMap((section) => section.items || [])

      // Use current site/subsite from companyState for creation/update
      // The CompanyContext will handle the path based on current selection
      const checklistData = {
        title: formData.title,
        description: formData.description,
        items: items,
        sections: formData.sections,
        siteId: companyState.selectedSiteID || formData.siteId || "",
        subsiteId: companyState.selectedSubsiteID || formData.subsiteId || undefined,
        assignedTo: formData.isGlobalAccess ? [] : [...formData.assignedTo],
        assignedToTeams: formData.isGlobalAccess ? [] : [...formData.assignedToTeams],
        assignedSites: formData.isGlobalAccess ? [] : [...formData.assignedSites],
        assignedSubsites: formData.isGlobalAccess ? [] : [...formData.assignedSubsites],
        category: formData.category || "",
        isGlobalAccess: formData.isGlobalAccess,
        schedule: formData.schedule,
        tracking: formData.tracking,
        status: formData.status,
        updatedAt: Date.now(),
      }

      if (editingChecklist) {
        await updateChecklist(editingChecklist.id, checklistData)
      } else {
        const newChecklistData = {
          ...checklistData,
          createdBy: userId,
        }
        await createChecklist(newChecklistData)
      }

      await loadData()
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "checklistsModal1",
        crudMode: editingChecklist ? "edit" : "create",
        id: editingChecklist?.id,
        itemLabel: formData.title,
      })
      handleCloseDialog()
    } catch (error) {
      console.error("Error saving checklist:", error)
      setError("Failed to save checklist")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteChecklist = async (checklistId: string) => {
    if (!companyState.companyID) return

    try {
      await deleteChecklist(checklistId)
      await loadData()
    } catch (err) {
      console.error("Error deleting checklist:", err)
      setError("Failed to delete checklist")
    }
  }

  const handleStatusChange = async (checklistId: string, newStatus: "active" | "draft" | "archived") => {
    if (!companyState.companyID || !companyState.selectedSiteID) return

    try {
      setLoading(true)
      await updateChecklist(checklistId, {
        status: newStatus,
        updatedAt: Date.now(),
      })
      await loadData()
    } catch (error) {
      console.error("Error updating checklist status:", error)
      setError("Failed to update checklist status")
    } finally {
      setLoading(false)
    }
  }

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, checklistId: string) => {
    setAnchorEl(event.currentTarget)
    setSelectedChecklistId(checklistId)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedChecklistId("")
  }


  const getCompletionStats = (checklistId: string) => {
    const checklistCompletions = completions.filter((c) => checklistIdsEqual(c.checklistId, checklistId))
    const totalCompletions = checklistCompletions.length
    const completedToday = checklistCompletions.filter((c) => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const raw = String((c as any)?.status || "").trim().toLowerCase()
      const isCompletedish = raw === "completed" || raw === "complete" || raw === "late" || raw === "expired"
      return c.completedAt >= today.getTime() && isCompletedish
    }).length

    return { totalCompletions, completedToday }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "success"
      case "draft":
        return "warning"
      case "archived":
        return "default"
      default:
        return "default"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircleIcon />
      case "draft":
        return <DraftIcon />
      case "archived":
        return <ArchiveIcon />
      default:
        return <AssignmentIcon />
    }
  }

  const getScheduleTypeLabel = (type?: string) => {
    switch (type) {
      case "once":
        return "One-time"
      case "daily":
        return "Daily"
      case "weekly":
        return "Weekly"
      case "monthly":
        return "Monthly"
      case "continuous":
        return "Continuous"
      case "4week":
        return "4-Week Cycle"
      default:
        return type ? String(type) : ""
    }
  }

  const renderChecklistCard = (checklist: CompanyChecklist) => {
    const assignedRoles = hrState.roles?.filter((role) => checklist.assignedTo?.includes(role.id)) || []
    const assignedDepartments =
      hrState.departments?.filter((dept) => checklist.assignedToTeams?.includes(dept.id)) || []
    const window = getChecklistWindowForChecklist(checklist)
    const openingLabel = window.openingAt ? format(window.openingAt, "dd MMM, HH:mm") : "-"
    const dueLabel = window.closingAt ? format(window.closingAt, "dd MMM, HH:mm") : "-"
    const expireLabel = window.expireAt ? format(window.expireAt, "dd MMM, HH:mm") : "—"

    return (
      <Card
        key={checklist.id}
        variant="outlined"
        sx={{ mb: 0, ...(mobileESSLayout ? { borderRadius: 2 } : {}) }}
      >
        <CardContent sx={{ py: 0.75, "&:last-child": { pb: 0.75 } }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr auto",
                md: "minmax(420px, 2.2fr) minmax(260px, 1fr) auto",
              },
              gap: 0.75,
              alignItems: "start",
            }}
          >
            {/* Column 1: Title + description */}
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ mb: 0, fontWeight: 700, lineHeight: 1.2 }}>
                {checklist.title}
              </Typography>
              {checklist.description ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mb: 0.25,
                    display: "-webkit-box",
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {checklist.description}
                </Typography>
              ) : null}

              {/* Compact meta line (avoid chip wrapping) */}
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 0.75,
                  alignItems: "center",
                  mt: 0.25,
                }}
              >
                <Chip
                  icon={getStatusIcon(checklist.status || "draft")}
                  label={(checklist.status || "draft").toUpperCase()}
                  color={getStatusColor(checklist.status || "draft") as any}
                  size="small"
                />
                <Typography variant="caption" color="text.secondary">
                  {checklist.category || "Uncategorised"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {getScheduleTypeLabel(checklist.schedule?.type)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {`${checklist.sections && Array.isArray(checklist.sections) ? checklist.sections.length : 0} sections`}
                </Typography>
                {checklist.isGlobalAccess ? (
                  <Typography variant="caption" color="info.main" sx={{ fontWeight: 600 }}>
                    Global
                  </Typography>
                ) : null}
              </Box>
            </Box>

            {/* Column 2: Schedule window */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
              <Typography variant="caption" color="text.secondary">
                Open:{" "}
                <Box component="span" sx={{ color: "text.primary", fontWeight: 600 }}>
                  {openingLabel}
                </Box>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Due:{" "}
                <Box component="span" sx={{ color: "text.primary", fontWeight: 600 }}>
                  {dueLabel}
                </Box>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Expire:{" "}
                <Box component="span" sx={{ color: "text.primary", fontWeight: 600 }}>
                  {expireLabel}
                </Box>
              </Typography>
            </Box>

            {/* Column 3: Actions */}
            <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-start", gap: 0.75 }}>
              {checklist.isGlobalAccess ? (
                <Chip
                  icon={<GroupIcon />}
                  label="Available to all users"
                  size="small"
                  color="info"
                  variant="filled"
                />
              ) : null}
              <IconButton size="small" onClick={(e) => handleMenuClick(e, checklist.id)}>
                <MoreVertIcon />
              </IconButton>
            </Box>
          </Box>

          {!checklist.isGlobalAccess && (
            <Box sx={{ mt: 0.5 }}>
              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", alignItems: "center" }}>
                <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                  Assigned:
                </Typography>
                {assignedRoles.map((role) => (
                  <Chip key={role.id} icon={<PersonIcon />} label={`Role: ${role.label || role.name}`} size="small" variant="outlined" color="primary" />
                ))}
                {assignedDepartments.map((dept) => (
                  <Chip key={dept.id} icon={<BusinessIcon />} label={`Dept: ${dept.name}`} size="small" variant="outlined" color="secondary" />
                ))}
                {checklist.assignedTo?.filter((id: any) => !assignedRoles.some(r => r.id===id)).map((assigneeId: any) => (
                  <Chip key={assigneeId} icon={<GroupIcon />} label={`User: ${assigneeId}`} size="small" variant="outlined" />
                ))}
              </Box>
            </Box>
          )}

          {/* Global access chip is shown top-right (actions column). */}
        </CardContent>
      </Card>
    )
  }

  const renderScheduleSection = () => {
    const weekDays: DayOfWeek[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

    return (
      <>
        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" sx={{ mb: 2 }}>
            Schedule
          </Typography>
        </Grid>
        <Grid item xs={12} md={4}>
          <Stack spacing={1}>
            <FormControl fullWidth size="small" sx={controlSx}>
              <InputLabel>Schedule Type</InputLabel>
              <Select
                value={formData.schedule.type}
                onChange={(e) => {
                  const type = e.target.value as "once" | "daily" | "weekly" | "monthly" | "continuous" | "4week"
                  setFormData((prev) => ({
                    ...prev,
                    schedule: {
                      ...prev.schedule,
                      type,
                      startDate: type === "4week" ? Date.now() : undefined,
                    },
                  }))
                }}
                label="Schedule Type"
                MenuProps={selectMenuProps}
              >
                <MenuItem value="once">One-time</MenuItem>
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="continuous">Continuous</MenuItem>
                <MenuItem value="4week">4-Week Cycle</MenuItem>
              </Select>
            </FormControl>

            {/* One-time expiry is configured with the closing window fields below. */}
          </Stack>
        </Grid>

        {formData.schedule.type === "daily" && (
          <Grid item xs={12} md={8} sx={{ display: "flex", alignItems: "center" }}>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
              {weekDays.map((day) => (
                <FormControlLabel
                  key={day}
                  control={
                    <Checkbox
                      checked={
                        formData.schedule.repeatDays?.[day as keyof typeof formData.schedule.repeatDays] || false
                      }
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          schedule: {
                            ...prev.schedule,
                            repeatDays: {
                              ...prev.schedule.repeatDays,
                              [day]: e.target.checked,
                            } as {
                              monday: boolean
                              tuesday: boolean
                              wednesday: boolean
                              thursday: boolean
                              friday: boolean
                              saturday: boolean
                              sunday: boolean
                            },
                          },
                        }))
                      }}
                    />
                  }
                  label={day.charAt(0).toUpperCase() + day.slice(1)}
                  sx={{ mr: 0.5, "& .MuiFormControlLabel-label": { fontSize: "0.85rem" } }}
                />
              ))}
            </Box>
          </Grid>
        )}

        {formData.schedule.type === "weekly" && (
          <>
            {/* Row 1: Type + Opening Day + Opening Time */}
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small" sx={controlSx}>
                <InputLabel>Opening Day</InputLabel>
                <Select
                  value={formData.schedule.openingDay || "monday"}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      schedule: { ...prev.schedule, openingDay: e.target.value as DayOfWeek },
                    }))
                  }
                  label="Opening Day"
                  MenuProps={selectMenuProps}
                >
                  {weekDays.map((d) => (
                    <MenuItem key={d} value={d}>
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <TimePicker
                  label="Opening Time"
                  value={
                    formData.schedule.openingTime
                      ? new Date(`2000-01-01T${formData.schedule.openingTime}:00`)
                      : new Date(`2000-01-01T09:00:00`)
                  }
                  onChange={(newValue) => {
                    if (newValue) {
                      setFormData((prev) => ({
                        ...prev,
                        schedule: {
                          ...prev.schedule,
                          openingTime: format(newValue, "HH:mm"),
                        },
                      }))
                    }
                  }}
                  slotProps={{ textField: { fullWidth: true, size: "small", sx: fieldSx } }}
                />
              </LocalizationProvider>
            </Grid>

            {/* Row 2: Closing Day + Closing Time + Expiry */}
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small" sx={controlSx}>
                <InputLabel>Closing Day</InputLabel>
                <Select
                  value={formData.schedule.closingDay || "friday"}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      schedule: { ...prev.schedule, closingDay: e.target.value as DayOfWeek },
                    }))
                  }
                  label="Closing Day"
                  MenuProps={selectMenuProps}
                >
                  {weekDays.map((d) => (
                    <MenuItem key={d} value={d}>
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <TimePicker
                  label="Closing Time"
                  value={
                    formData.schedule.closingTime
                      ? new Date(`2000-01-01T${formData.schedule.closingTime}:00`)
                      : new Date(`2000-01-01T17:00:00`)
                  }
                  onChange={(newValue) => {
                    if (newValue) {
                      setFormData((prev) => ({
                        ...prev,
                        schedule: {
                          ...prev.schedule,
                          closingTime: format(newValue, "HH:mm"),
                        },
                      }))
                    }
                  }}
                  slotProps={{ textField: { fullWidth: true, size: "small", sx: fieldSx } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label=" "
                value=""
                disabled
                sx={{ ...fieldSx, visibility: "hidden" }}
              />
            </Grid>
          </>
        )}

        {formData.schedule.type === "monthly" && (
          <>
            {/* Row 1: Type + Opening Date + Opening Time */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label="Opening Date"
                type="number"
                value={formData.schedule.openingDate ?? 1}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    schedule: {
                      ...prev.schedule,
                      openingDate: Math.min(31, Math.max(1, Number.parseInt(e.target.value) || 1)),
                    },
                  }))
                }
                inputProps={{ min: 1, max: 31 }}
                sx={fieldSx}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <TimePicker
                  label="Opening Time"
                  value={
                    formData.schedule.openingTime
                      ? new Date(`2000-01-01T${formData.schedule.openingTime}:00`)
                      : new Date(`2000-01-01T09:00:00`)
                  }
                  onChange={(newValue) => {
                    if (newValue) {
                      setFormData((prev) => ({
                        ...prev,
                        schedule: {
                          ...prev.schedule,
                          openingTime: format(newValue, "HH:mm"),
                        },
                      }))
                    }
                  }}
                  slotProps={{ textField: { fullWidth: true, size: "small", sx: fieldSx } }}
                />
              </LocalizationProvider>
            </Grid>

            {/* Row 2: Closing Date + Closing Time + Expiry */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label="Closing Date"
                type="number"
                value={formData.schedule.closingDate ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    schedule: {
                      ...prev.schedule,
                      closingDate: e.target.value === "" ? undefined : Math.min(31, Math.max(1, Number.parseInt(e.target.value) || 1)),
                    },
                  }))
                }
                inputProps={{ min: 1, max: 31 }}
                placeholder="(optional)"
                sx={fieldSx}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <TimePicker
                  label="Closing Time"
                  value={
                    formData.schedule.closingTime
                      ? new Date(`2000-01-01T${formData.schedule.closingTime}:00`)
                      : new Date(`2000-01-01T17:00:00`)
                  }
                  onChange={(newValue) => {
                    if (newValue) {
                      setFormData((prev) => ({
                        ...prev,
                        schedule: {
                          ...prev.schedule,
                          closingTime: format(newValue, "HH:mm"),
                        },
                      }))
                    }
                  }}
                  slotProps={{ textField: { fullWidth: true, size: "small", sx: fieldSx } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label="Expiry (hours)"
                type="number"
                value={formData.schedule.expireTime || 24}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    schedule: {
                      ...prev.schedule,
                      expireTime: Number.parseInt(e.target.value) || 24,
                    },
                  }))
                }
                inputProps={{ min: 1 }}
                sx={fieldSx}
              />
            </Grid>
          </>
        )}

        {formData.schedule.type === "4week" && (
          <>
            <Grid item xs={12} md={4}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Opening Date"
                  value={formData.schedule.startDate ? new Date(formData.schedule.startDate) : new Date()}
                  onChange={(newValue) => {
                    if (newValue) {
                      setFormData((prev) => ({
                        ...prev,
                        schedule: {
                          ...prev.schedule,
                          startDate: newValue.getTime(),
                        },
                      }))
                    }
                  }}
                  slotProps={{ textField: { fullWidth: true, size: "small", sx: fieldSx } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={4}>
              {(() => {
                const start = formData.schedule.startDate ? new Date(formData.schedule.startDate) : new Date()
                const now = new Date()
                const cycleMs = 28 * 24 * 60 * 60 * 1000
                const startMs = start.getTime()
                const nowMs = now.getTime()
                const cyclesPassed = nowMs >= startMs ? Math.floor((nowMs - startMs) / cycleMs) : -1
                const nextStartMs = cyclesPassed >= 0 ? startMs + (cyclesPassed + 1) * cycleMs : startMs
                const nextStart = new Date(nextStartMs)

                return (
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Next Start Date"
                      value={nextStart}
                      disabled
                      slotProps={{ textField: { fullWidth: true, size: "small", sx: fieldSx } }}
                    />
                  </LocalizationProvider>
                )
              })()}
            </Grid>
          </>
        )}

        {formData.schedule.type === "once" && (
          <>
            <Grid item xs={12} md={4}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Opening Date"
                  value={formData.schedule.startDate ? new Date(formData.schedule.startDate) : new Date()}
                  onChange={(newValue) => {
                    if (newValue) {
                      setFormData((prev) => ({
                        ...prev,
                        schedule: {
                          ...prev.schedule,
                          startDate: newValue.getTime(),
                        },
                      }))
                    }
                  }}
                  slotProps={{ textField: { fullWidth: true, size: "small", sx: fieldSx } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={4}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <TimePicker
                  label={formData.schedule.type === "4week" ? "Start Time" : "Opening Time"}
                  value={
                    formData.schedule.openingTime
                      ? new Date(`2000-01-01T${formData.schedule.openingTime}:00`)
                      : new Date(`2000-01-01T09:00:00`)
                  }
                  onChange={(newValue) => {
                    if (newValue) {
                      setFormData((prev) => ({
                        ...prev,
                        schedule: {
                          ...prev.schedule,
                          openingTime: format(newValue, "HH:mm"),
                        },
                      }))
                    }
                  }}
                  slotProps={{ textField: { fullWidth: true, size: "small", sx: fieldSx } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={4} />

            <Grid item xs={12} md={4}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Closing Date"
                  value={formData.schedule.dueTime ? new Date(formData.schedule.dueTime) : new Date()}
                  onChange={(newValue) => {
                    if (newValue) {
                      setFormData((prev) => ({
                        ...prev,
                        schedule: {
                          ...prev.schedule,
                          dueTime: newValue.getTime(),
                        },
                      }))
                    }
                  }}
                  slotProps={{ textField: { fullWidth: true, size: "small", sx: fieldSx } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={4}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <TimePicker
                  label={formData.schedule.type === "4week" ? "Close Time" : "Closing Time"}
                  value={
                    formData.schedule.closingTime
                      ? new Date(`2000-01-01T${formData.schedule.closingTime}:00`)
                      : new Date(`2000-01-01T17:00:00`)
                  }
                  onChange={(newValue) => {
                    if (newValue) {
                      setFormData((prev) => ({
                        ...prev,
                        schedule: {
                          ...prev.schedule,
                          closingTime: format(newValue, "HH:mm"),
                        },
                      }))
                    }
                  }}
                  slotProps={{ textField: { fullWidth: true, size: "small", sx: fieldSx } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label="Expiry (hours)"
                type="number"
                value={formData.schedule.expireTime || 24}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    schedule: {
                      ...prev.schedule,
                      expireTime: Number.parseInt(e.target.value) || 24,
                    },
                  }))
                }
                inputProps={{ min: 1 }}
                sx={fieldSx}
              />
            </Grid>
          </>
        )}

        {formData.schedule.type !== "once" &&
          formData.schedule.type !== "continuous" &&
          formData.schedule.type !== "weekly" &&
          formData.schedule.type !== "monthly" && (
          <>
            <Grid item xs={12} md={4}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <TimePicker
                  label="Opening Time"
                  value={
                    formData.schedule.openingTime
                      ? new Date(`2000-01-01T${formData.schedule.openingTime}:00`)
                      : new Date(`2000-01-01T09:00:00`)
                  }
                  onChange={(newValue) => {
                    if (newValue) {
                      setFormData((prev) => ({
                        ...prev,
                        schedule: {
                          ...prev.schedule,
                          openingTime: format(newValue, "HH:mm"),
                        },
                      }))
                    }
                  }}
                  slotProps={{ textField: { fullWidth: true, size: "small", sx: fieldSx } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={4}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <TimePicker
                  label="Closing Time"
                  value={
                    formData.schedule.closingTime
                      ? new Date(`2000-01-01T${formData.schedule.closingTime}:00`)
                      : new Date(`2000-01-01T17:00:00`)
                  }
                  onChange={(newValue) => {
                    if (newValue) {
                      setFormData((prev) => ({
                        ...prev,
                        schedule: {
                          ...prev.schedule,
                          closingTime: format(newValue, "HH:mm"),
                        },
                      }))
                    }
                  }}
                  slotProps={{ textField: { fullWidth: true, size: "small", sx: fieldSx } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label="Expiry (hours)"
                type="number"
                value={formData.schedule.expireTime || 24}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    schedule: {
                      ...prev.schedule,
                      expireTime: Number.parseInt(e.target.value) || 24,
                    },
                  }))
                }
                inputProps={{ min: 1 }}
                sx={fieldSx}
              />
            </Grid>
          </>
        )}
      </>
    )
  }

  const toggleIdInList = (list: string[], id: string, next: boolean): string[] => {
    if (next) return list.includes(id) ? list : [...list, id]
    return list.filter((x) => x !== id)
  }

  const renderSectionsAndItems = () => (
    <>
      <Grid item xs={12}>
        <Box sx={{ mb: 1 }} />
      </Grid>

      {formData.sections.map((section, sectionIndex) => (
        <Grid item xs={12} key={section.id}>
          <Accordion
            variant="outlined"
            disableGutters
            expanded={expandedSectionId === section.id}
            onChange={(_, expanded) => setExpandedSectionId(expanded ? section.id : null)}
            sx={{
              "&:before": { display: "none" },
              borderRadius: 1,
              overflow: "hidden",
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon fontSize="small" />}
              sx={{
                px: 1.25,
                minHeight: 42,
                "& .MuiAccordionSummary-content": { my: 0.5 },
              }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", width: "100%" }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {section.title?.trim() ? section.title : `Section ${sectionIndex + 1}`}
                </Typography>
                <Box sx={{ flex: 1 }} />
                <FormControlLabel
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                  control={
                    <Switch
                      size="small"
                      checked={(section.sectionType || "normal") === "logs"}
                      onChange={(e) => {
                        const nextIsLogs = e.target.checked
                        const newSections = [...formData.sections]
                        const current = newSections[sectionIndex]
                        const nextItems = (current.items || []).map((it: any) => {
                          const allowed = new Set(["text", "number", "checkbox"])
                          const nextType = nextIsLogs && !allowed.has(String(it.type || "text")) ? "text" : it.type
                          return {
                            ...it,
                            type: nextType,
                            required: nextIsLogs ? false : Boolean(it.required),
                          }
                        })
                        newSections[sectionIndex] = {
                          ...current,
                          sectionType: nextIsLogs ? "logs" : "normal",
                          items: nextItems,
                        }
                        setFormData((prev) => ({ ...prev, sections: newSections }))
                      }}
                    />
                  }
                  label={<Typography variant="caption">Logs</Typography>}
                  sx={{ m: 0, mr: 0.5 }}
                />
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation()
                    if (expandedSectionId === section.id) {
                      setExpandedSectionId(null)
                    }
                    setFormData((prev) => ({
                      ...prev,
                      sections: prev.sections.filter((_: any, index: number) => index !== sectionIndex),
                    }))
                  }}
                  color="error"
                  size="small"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 1.25, pt: 1.25, pb: 1.5 }}>
              <Grid container spacing={1.25}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Section Title"
                    value={section.title}
                    onChange={(e) => {
                      const newSections = [...formData.sections]
                      newSections[sectionIndex] = {
                        ...newSections[sectionIndex],
                        title: e.target.value,
                      }
                      setFormData((prev) => ({ ...prev, sections: newSections }))
                    }}
                    sx={fieldSx}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Section Description"
                    value={section.description}
                    onChange={(e) => {
                      const newSections = [...formData.sections]
                      newSections[sectionIndex] = {
                        ...newSections[sectionIndex],
                        description: e.target.value,
                      }
                      setFormData((prev) => ({ ...prev, sections: newSections }))
                    }}
                    sx={fieldSx}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 0.25 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    Items ({section.items?.length || 0})
                  </Typography>
                </Grid>

                {(section.items || []).map((item: ChecklistItem, itemIndex: number) => (
                  <Grid item xs={12} key={item.id}>
                    <Box
                      sx={{
                        border: 1,
                        borderColor: "divider",
                        borderRadius: 1,
                        p: 1.25,
                        bgcolor: "background.paper",
                      }}
                    >
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.75 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                          Item {itemIndex + 1}
                        </Typography>
                        <Box sx={{ flex: 1 }} />
                        {item.required && <Chip size="small" label="Required" color="warning" variant="outlined" />}
                        <FormControlLabel
                          control={
                            <Switch
                              size="small"
                              checked={Boolean(item.required)}
                              onChange={(e) => {
                                const newSections = [...formData.sections]
                                if (newSections[sectionIndex].items) {
                                  newSections[sectionIndex].items![itemIndex] = {
                                    ...newSections[sectionIndex].items![itemIndex],
                                    required: e.target.checked,
                                  }
                                  setFormData((prev) => ({ ...prev, sections: newSections }))
                                }
                              }}
                              disabled={(section.sectionType || "normal") === "logs"}
                            />
                          }
                          label={<Typography variant="caption">Req</Typography>}
                          sx={{ m: 0, mr: 0.25 }}
                        />
                        <IconButton
                          onClick={() => {
                            const newSections = [...formData.sections]
                            newSections[sectionIndex] = {
                              ...newSections[sectionIndex],
                              items: newSections[sectionIndex].items?.filter((_, index) => index !== itemIndex) || [],
                            }
                            setFormData((prev) => ({ ...prev, sections: newSections }))
                          }}
                          color="error"
                          size="small"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>

                      <Grid container spacing={1.25}>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Item Title"
                            value={item.title || item.text}
                            onChange={(e) => {
                              const newSections = [...formData.sections]
                              if (newSections[sectionIndex].items) {
                                newSections[sectionIndex].items![itemIndex] = {
                                  ...newSections[sectionIndex].items![itemIndex],
                                  title: e.target.value,
                                  text: e.target.value,
                                }
                                setFormData((prev) => ({ ...prev, sections: newSections }))
                              }
                            }}
                            sx={fieldSx}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Item Description"
                            value={item.description}
                            onChange={(e) => {
                              const newSections = [...formData.sections]
                              if (newSections[sectionIndex].items) {
                                newSections[sectionIndex].items![itemIndex] = {
                                  ...newSections[sectionIndex].items![itemIndex],
                                  description: e.target.value,
                                }
                                setFormData((prev) => ({ ...prev, sections: newSections }))
                              }
                            }}
                            sx={fieldSx}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <FormControl fullWidth size="small" sx={controlSx}>
                            <InputLabel>Response Type</InputLabel>
                            <Select
                              value={item.type || "text"}
                              onChange={(e) => {
                                const newSections = [...formData.sections]
                                if (newSections[sectionIndex].items) {
                                  const type = e.target.value as "text" | "number" | "checkbox" | "file" | "signature"
                                  newSections[sectionIndex].items![itemIndex] = {
                                    ...newSections[sectionIndex].items![itemIndex],
                                    type,
                                    validation: type === "number" ? { min: 0, max: 100 } : undefined,
                                  }
                                  setFormData((prev) => ({ ...prev, sections: newSections }))
                                }
                              }}
                              label="Response Type"
                              MenuProps={selectMenuProps}
                            >
                              <MenuItem value="text">Text</MenuItem>
                              <MenuItem value="number">Number</MenuItem>
                              <MenuItem value="checkbox">Yes/No</MenuItem>
                              {(section.sectionType || "normal") !== "logs" && (
                                <MenuItem value="file">Photo</MenuItem>
                              )}
                              {(section.sectionType || "normal") !== "logs" && (
                                <MenuItem value="signature">Signature</MenuItem>
                              )}
                            </Select>
                          </FormControl>
                        </Grid>

                        {item.type === "number" && (
                          <>
                            <Grid item xs={12} md={3}>
                              <TextField
                                fullWidth
                                size="small"
                                label="Min"
                                type="number"
                                value={item.validation?.min || ""}
                                onChange={(e) => {
                                  const newSections = [...formData.sections]
                                  if (newSections[sectionIndex].items) {
                                    newSections[sectionIndex].items![itemIndex] = {
                                      ...newSections[sectionIndex].items![itemIndex],
                                      validation: {
                                        ...newSections[sectionIndex].items![itemIndex].validation,
                                        min: e.target.value ? Number.parseFloat(e.target.value) : undefined,
                                      },
                                    }
                                    setFormData((prev) => ({ ...prev, sections: newSections }))
                                  }
                                }}
                                sx={fieldSx}
                              />
                            </Grid>
                            <Grid item xs={12} md={3}>
                              <TextField
                                fullWidth
                                size="small"
                                label="Max"
                                type="number"
                                value={item.validation?.max || ""}
                                onChange={(e) => {
                                  const newSections = [...formData.sections]
                                  if (newSections[sectionIndex].items) {
                                    newSections[sectionIndex].items![itemIndex] = {
                                      ...newSections[sectionIndex].items![itemIndex],
                                      validation: {
                                        ...newSections[sectionIndex].items![itemIndex].validation,
                                        max: e.target.value ? Number.parseFloat(e.target.value) : undefined,
                                      },
                                    }
                                    setFormData((prev) => ({ ...prev, sections: newSections }))
                                  }
                                }}
                                sx={fieldSx}
                              />
                            </Grid>
                          </>
                        )}

                        {/* Required is controlled via the header toggle */}
                      </Grid>
                    </Box>
                  </Grid>
                ))}

                <Grid item xs={12}>
                  <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
                    <Button
                      startIcon={<AddIcon />}
                      onClick={() => {
                        const newItem: ChecklistItem = {
                          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                          text: "",
                          title: "",
                          description: "",
                          type: "text",
                          required: false,
                          order: (section.items?.length || 0) + 1,
                          completed: false,
                          priority: "medium",
                          createdAt: Date.now(),
                          updatedAt: Date.now(),
                        }
                        const newSections = [...formData.sections]
                        if (!newSections[sectionIndex].items) {
                          newSections[sectionIndex].items = []
                        }
                        newSections[sectionIndex].items!.push(newItem)
                        setFormData((prev) => ({ ...prev, sections: newSections }))
                      }}
                      variant="outlined"
                      size="small"
                    >
                      Add Item
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>
      ))}

      <Grid item xs={12}>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: "center" }}>
            <Button
              startIcon={<AddIcon />}
              onClick={() => {
                const newSection: ChecklistSection = {
                  id: `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  title: "",
                  description: "",
                  items: [],
                  order: formData.sections.length + 1,
                  sectionType: "normal",
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                }
                setExpandedSectionId(newSection.id)
                setFormData((prev) => ({
                  ...prev,
                  sections: [...prev.sections, newSection],
                }))
              }}
              variant="contained"
              color="primary"
              size="small"
            >
              Add Section
            </Button>
          </Stack>
        </Box>
      </Grid>
    </>
  )

  const renderSiteAssignmentSection = () => (
    <>
      <Grid item xs={12}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" sx={{ mb: 2 }}>
          Site & Subsite Assignments
        </Typography>
      </Grid>

      <Grid item xs={12}>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Assign by Sites</Typography>
            {formData.assignedSites.length > 0 && (
              <Chip label={`${formData.assignedSites.length} selected`} size="small" color="primary" sx={{ ml: 2 }} />
            )}
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup>
              {companyState.sites && companyState.sites.length > 0 ? (
                companyState.sites.map((site: any) => (
                  <FormControlLabel
                    key={site.siteID}
                    control={
                      <Checkbox
                        checked={formData.assignedSites.includes(site.siteID)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData((prev) => ({
                              ...prev,
                              assignedSites: [...prev.assignedSites, site.siteID],
                            }))
                          } else {
                            setFormData((prev) => ({
                              ...prev,
                              assignedSites: prev.assignedSites.filter((s) => s !== site.siteID),
                            }))
                          }
                        }}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {site.name}
                        </Typography>
                        {site.address && (
                          <Typography variant="caption" color="text.secondary">
                            {typeof site.address === "string"
                              ? site.address
                              : `${site.address.street}, ${site.address.city}, ${site.address.state} ${site.address.zipCode}`}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No sites available.
                </Typography>
              )}
            </FormGroup>
          </AccordionDetails>
        </Accordion>
      </Grid>

      <Grid item xs={12}>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Assign by Subsites</Typography>
            {formData.assignedSubsites.length > 0 && (
              <Chip label={`${formData.assignedSubsites.length} selected`} size="small" color="primary" sx={{ ml: 2 }} />
            )}
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup>
              {companyState.sites && companyState.sites.length > 0 ? (
                companyState.sites.map((site: any) => (
                  <Box key={site.siteID}>
                    <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: "bold" }}>
                      {site.name}
                    </Typography>
                    {site.subsites && Object.values(site.subsites).length > 0 ? (
                      Object.values(site.subsites).map((subsite: any) => (
                        <FormControlLabel
                          key={subsite.subsiteID}
                          control={
                            <Checkbox
                              checked={formData.assignedSubsites.includes(subsite.subsiteID)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData((prev) => ({
                                    ...prev,
                                    assignedSubsites: [...prev.assignedSubsites, subsite.subsiteID],
                                  }))
                                } else {
                                  setFormData((prev) => ({
                                    ...prev,
                                    assignedSubsites: prev.assignedSubsites.filter((s) => s !== subsite.subsiteID),
                                  }))
                                }
                              }}
                            />
                          }
                          label={
                            <Box sx={{ ml: 2 }}>
                              <Typography variant="body2" fontWeight="medium">
                                {subsite.name}
                              </Typography>
                              {subsite.description && (
                                <Typography variant="caption" color="text.secondary">
                                  {subsite.description}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      ))
                    ) : (
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                        No subsites available for this site
                      </Typography>
                    )}
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No sites available.
                </Typography>
              )}
            </FormGroup>
          </AccordionDetails>
        </Accordion>
      </Grid>
    </>
  )

  const renderAssignmentsSection = () => (
    <>
      <Grid item xs={12}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" sx={{ mb: 2 }}>
          Role & Department Assignments
        </Typography>
      </Grid>

      <Grid item xs={12}>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Assign by Roles</Typography>
            {formData.assignedTo.length > 0 && (
              <Chip label={`${formData.assignedTo.length} selected`} size="small" color="primary" sx={{ ml: 2 }} />
            )}
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup>
              {hrState.roles && hrState.roles.length > 0 ? (
                hrState.roles.map((role) => (
                  <FormControlLabel
                    key={role.id}
                    control={
                      <Checkbox
                        checked={formData.assignedTo.includes(role.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData((prev) => ({ ...prev, assignedTo: [...prev.assignedTo, role.id] }))
                          } else {
                            setFormData((prev) => ({ ...prev, assignedTo: prev.assignedTo.filter((r) => r !== role.id) }))
                          }
                        }}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {role.label || role.name}
                        </Typography>
                        {role.description && (
                          <Typography variant="caption" color="text.secondary">
                            {role.description}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No roles available. Create roles in HR management first.
                </Typography>
              )}
            </FormGroup>
          </AccordionDetails>
        </Accordion>
      </Grid>

      <Grid item xs={12}>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Assign by Departments</Typography>
            {formData.assignedToTeams.length > 0 && (
              <Chip label={`${formData.assignedToTeams.length} selected`} size="small" color="primary" sx={{ ml: 2 }} />
            )}
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup>
              {hrState.departments && hrState.departments.length > 0 ? (
                hrState.departments.map((dept) => (
                  <FormControlLabel
                    key={dept.id}
                    control={
                      <Checkbox
                        checked={formData.assignedToTeams.includes(dept.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData((prev) => ({
                              ...prev,
                              assignedToTeams: [...prev.assignedToTeams, dept.id],
                            }))
                          } else {
                            setFormData((prev) => ({
                              ...prev,
                              assignedToTeams: prev.assignedToTeams.filter((d) => d !== dept.id),
                            }))
                          }
                        }}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {dept.name}
                        </Typography>
                        {dept.description && (
                          <Typography variant="caption" color="text.secondary">
                            {dept.description}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No departments available. Create departments in HR management first.
                </Typography>
              )}
            </FormGroup>
          </AccordionDetails>
        </Accordion>
      </Grid>
    </>
  )

  const hasActiveFilters = filters.search || filters.category || filters.status || filters.scheduleType

  const scheduleTypeOptions = [
    { id: "once", name: "One-time" },
    { id: "daily", name: "Daily" },
    { id: "weekly", name: "Weekly" },
    { id: "monthly", name: "Monthly" },
    { id: "continuous", name: "Continuous" },
    { id: "4week", name: "4-Week Cycle" },
  ]

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <RequireCompanyContext requireSite>
      <Box
        sx={{
          ...(mobileESSLayout
            ? {
                p: { xs: 1.5, sm: 2 },
                pb: { xs: 12, sm: 4 },
                maxWidth: "100%",
                overflowX: "hidden",
              }
            : { p: 0 }),
        }}
      >
        <DataHeader
          title={mobileESSLayout ? "Company checklists" : undefined}
          mobileESSLayout={mobileESSLayout}
          searchTerm={filters.search}
          onSearchChange={(search) => setFilters((prev) => ({ ...prev, search }))}
          searchPlaceholder="Search checklists..."
          showDateControls={false}
          filters={[
            {
              label: "Category",
              options: categories.map(cat => ({ id: cat, name: cat })),
              selectedValues: filters.category ? [filters.category] : [],
              onSelectionChange: (values) => setFilters((prev) => ({ ...prev, category: values[0] || "" }))
            },
            {
              label: "Status",
              options: [
                { id: "active", name: "Active" },
                { id: "draft", name: "Draft" },
                { id: "archived", name: "Archived" }
              ],
              selectedValues: filters.status ? [filters.status] : [],
              onSelectionChange: (values) => setFilters((prev) => ({ ...prev, status: values[0] || "" }))
            },
            {
              label: "Schedule",
              options: scheduleTypeOptions,
              selectedValues: filters.scheduleType ? [filters.scheduleType] : [],
              onSelectionChange: (values) => setFilters((prev) => ({ ...prev, scheduleType: values[0] || "" })),
            }
          ]}
          filtersExpanded={filtersExpanded}
          onFiltersToggle={() => setFiltersExpanded(!filtersExpanded)}
          sortOptions={[
            { value: "title", label: "Title" },
            { value: "open", label: "Next Open" },
            { value: "due", label: "Next Due" },
            { value: "expire", label: "Next Expire" },
            { value: "created", label: "Created Date" },
            { value: "updated", label: "Updated Date" },
            { value: "category", label: "Category" },
            { value: "section", label: "Sections" }
          ]}
          sortValue={filters.sortBy}
          sortDirection={filters.sortOrder}
          onSortChange={(value, direction) => setFilters((prev) => ({ ...prev, sortBy: value, sortOrder: direction }))}
          onExportCSV={() => {
            setError("CSV export feature coming soon!")
          }}
          onCreateNew={() => handleOpenDialog()}
          createButtonLabel="Create Checklist"
        />

        {mobileESSLayout && (
          <Card
            sx={{
              mb: { xs: 2, sm: 2 },
              borderRadius: { xs: 2, sm: 3 },
              bgcolor: alpha(theme.palette.primary.main, 0.08),
            }}
          >
            <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Grid container spacing={0}>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: "center", py: { xs: 0.5, sm: 0 } }}>
                    <AssignmentIcon sx={{ fontSize: { xs: 22, sm: 26 }, color: "primary.main", mb: 0.25 }} />
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: 700, fontSize: { xs: "1.35rem", sm: "1.75rem" }, lineHeight: 1.2 }}
                    >
                      {checklistSummary.total}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: { xs: "0.65rem", sm: "0.75rem" }, display: "block" }}
                    >
                      Total
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: "center", py: { xs: 0.5, sm: 0 } }}>
                    <CheckCircleIcon sx={{ fontSize: { xs: 22, sm: 26 }, color: "success.main", mb: 0.25 }} />
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: 700, color: "success.main", fontSize: { xs: "1.35rem", sm: "1.75rem" }, lineHeight: 1.2 }}
                    >
                      {checklistSummary.active}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: { xs: "0.65rem", sm: "0.75rem" }, display: "block" }}
                    >
                      Active
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: "center", py: { xs: 0.5, sm: 0 } }}>
                    <DraftIcon sx={{ fontSize: { xs: 22, sm: 26 }, color: "warning.main", mb: 0.25 }} />
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: 700, fontSize: { xs: "1.35rem", sm: "1.75rem" }, lineHeight: 1.2 }}
                    >
                      {checklistSummary.draft}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: { xs: "0.65rem", sm: "0.75rem" }, display: "block" }}
                    >
                      Draft
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: "center", py: { xs: 0.5, sm: 0 } }}>
                    <ArchiveIcon sx={{ fontSize: { xs: 22, sm: 26 }, color: "text.secondary", mb: 0.25 }} />
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: 700, fontSize: { xs: "1.35rem", sm: "1.75rem" }, lineHeight: 1.2 }}
                    >
                      {checklistSummary.archived}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: { xs: "0.65rem", sm: "0.75rem" }, display: "block" }}
                    >
                      Archived
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* No loading indicators — UI renders and fills as data arrives */}

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Checklists List */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {filteredChecklists.length === 0 ? (
            <EmptyStateCard
              icon={AssignmentIcon}
              title={hasActiveFilters ? "No checklists match your current filters" : "No checklists found"}
              description={
                hasActiveFilters ? "Try adjusting your filters or search query" : "Create your first checklist to get started."
              }
            />
          ) : (
            filteredChecklists.map(renderChecklistCard)
          )}
        </Box>

        {/* Context Menu */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <MenuItem
            onClick={() => {
              const checklist = checklists.find((c) => c.id === selectedChecklistId)
              if (checklist) {
                handleOpenDialog(checklist)
              }
              handleMenuClose()
            }}
          >
            <ListItemIcon>
              <EditIcon />
            </ListItemIcon>
            Edit
          </MenuItem>
          <MenuItem
            onClick={() => {
              if (selectedChecklistId) {
                handleStatusChange(selectedChecklistId, "active")
              }
              handleMenuClose()
            }}
          >
            <ListItemIcon>
              <CheckCircleIcon />
            </ListItemIcon>
            Mark Active
          </MenuItem>
          <MenuItem
            onClick={() => {
              if (selectedChecklistId) {
                handleStatusChange(selectedChecklistId, "archived")
              }
              handleMenuClose()
            }}
          >
            <ListItemIcon>
              <ArchiveIcon />
            </ListItemIcon>
            Archive
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={() => {
              if (selectedChecklistId && window.confirm("Are you sure you want to delete this checklist?")) {
                handleDeleteChecklist(selectedChecklistId)
              }
              handleMenuClose()
            }}
            sx={{ color: "error.main" }}
          >
            <ListItemIcon>
              <DeleteIcon color="error" />
            </ListItemIcon>
            Delete
          </MenuItem>
        </Menu>

        {/* Create/Edit Modal */}
        <CRUDModal
          open={dialogOpen}
          onClose={(reason) => {
            setDialogOpen(false)
            if (isCrudModalHardDismiss(reason)) {
              resetForm()
            }
          }}
          workspaceFormShortcut={{
            crudEntity: "checklistsModal1",
            crudMode: editingChecklist ? "edit" : "create",
            id: editingChecklist?.id,
            itemLabel: formData.title || editingChecklist?.title,
          }}
          title={editingChecklist ? "Edit Checklist" : "Create New Checklist"}
          icon={<AssignmentIcon />}
          mode={editingChecklist ? "edit" : "create"}
          onSave={handleSaveChecklist}
          saveButtonText={editingChecklist ? "Update" : "Create"}
          maxWidth="lg"
          loading={loading}
          cancelButtonText={undefined}
        >
          <Box sx={{ mt: 0.5 }}>
            <Tabs
              value={modalTab}
              onChange={(_, v) => setModalTab(v)}
              sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
            >
              <Tab label="Details" />
              <Tab label="Checklist Sections" />
            </Tabs>

            {modalTab === 0 && (
              <Grid container spacing={2}>
                {/* Row 1: Title / Category / Status */}
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Title"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    required
                    sx={fieldSx}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small" sx={controlSx}>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={formData.category}
                      onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                      label="Category"
                      MenuProps={selectMenuProps}
                    >
                      {categories.map((category) => (
                        <MenuItem key={category} value={category}>
                          {category}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small" sx={controlSx}>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          status: e.target.value as "active" | "draft" | "archived",
                        }))
                      }
                      label="Status"
                      MenuProps={selectMenuProps}
                    >
                      <MenuItem value="draft">Draft</MenuItem>
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="archived">Archived</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Row 2: Description + Tracking Options (same row) */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Description"
                    multiline
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    sx={fieldSx}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Stack
                    spacing={0.25}
                    sx={{
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 1,
                      p: 1,
                      height: "100%",
                      justifyContent: "center",
                    }}
                  >
                    <Grid container spacing={0}>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={formData.tracking.requireSignature}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  tracking: { ...prev.tracking, requireSignature: e.target.checked },
                                }))
                              }
                            />
                          }
                          label="Require Signature"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={formData.tracking.requirePhotos}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  tracking: { ...prev.tracking, requirePhotos: e.target.checked },
                                }))
                              }
                            />
                          }
                          label="Require Photos"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={formData.tracking.requireNotes}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  tracking: { ...prev.tracking, requireNotes: e.target.checked },
                                }))
                              }
                            />
                          }
                          label="Require Notes"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={formData.tracking.requireLocation}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  tracking: { ...prev.tracking, requireLocation: e.target.checked },
                                }))
                              }
                            />
                          }
                          label="Require Location"
                        />
                      </Grid>
                    </Grid>
                  </Stack>
                </Grid>

                {/* Schedule Section (keep logic) */}
                {renderScheduleSection()}

                {/* Assignments */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 0.5 }} />
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={2}
                    sx={{ alignItems: { md: "center" }, justifyContent: "space-between" }}
                  >
                    <Typography variant="subtitle2">Assignments</Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={formData.isGlobalAccess}
                          onChange={(e) => setFormData((prev) => ({ ...prev, isGlobalAccess: e.target.checked }))}
                        />
                      }
                      label="Global (available to all users)"
                      sx={{ "& .MuiFormControlLabel-label": { fontSize: "0.875rem" } }}
                    />
                  </Stack>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Accordion variant="outlined" disableGutters sx={{ "&:before": { display: "none" } }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 1.5 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center", width: "100%" }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Sites & Subsites
                        </Typography>
                        <Box sx={{ flex: 1 }} />
                        <Chip
                          size="small"
                          variant="outlined"
                          label={`${(formData.assignedSites?.length || 0) + (formData.assignedSubsites?.length || 0)} selected`}
                        />
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: 1.5 }}>
                      <Stack spacing={1}>
                        {(companyState.sites || []).map((site: any) => {
                          const subs = site?.subsites ? Object.values(site.subsites) : []
                          return (
                            <Accordion key={site.siteID} variant="outlined" disableGutters sx={{ "&:before": { display: "none" } }}>
                              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 1 }}>
                                <Stack direction="row" spacing={1} sx={{ alignItems: "center", width: "100%" }}>
                                  <Checkbox
                                    checked={formData.assignedSites.includes(site.siteID)}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        assignedSites: toggleIdInList(prev.assignedSites, site.siteID, e.target.checked),
                                      }))
                                    }
                                    disabled={formData.isGlobalAccess}
                                    size="small"
                                  />
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {site.name || site.siteID}
                                  </Typography>
                                  <Box sx={{ flex: 1 }} />
                                  <Typography variant="caption" color="text.secondary">
                                    {subs.length} subsites
                                  </Typography>
                                </Stack>
                              </AccordionSummary>
                              <AccordionDetails sx={{ px: 1 }}>
                                {subs.length === 0 ? (
                                  <Typography variant="caption" color="text.secondary">
                                    No subsites
                                  </Typography>
                                ) : (
                                  <FormGroup>
                                    {subs.map((sub: any) => (
                                      <FormControlLabel
                                        key={sub.subsiteID}
                                        control={
                                          <Checkbox
                                            checked={formData.assignedSubsites.includes(sub.subsiteID)}
                                            onChange={(e) =>
                                              setFormData((prev) => ({
                                                ...prev,
                                                assignedSubsites: toggleIdInList(
                                                  prev.assignedSubsites,
                                                  sub.subsiteID,
                                                  e.target.checked,
                                                ),
                                              }))
                                            }
                                            disabled={formData.isGlobalAccess}
                                            size="small"
                                          />
                                        }
                                        label={<Typography variant="body2">{sub.name || sub.subsiteID}</Typography>}
                                        sx={{ ml: 2 }}
                                      />
                                    ))}
                                  </FormGroup>
                                )}
                              </AccordionDetails>
                            </Accordion>
                          )
                        })}
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Accordion variant="outlined" disableGutters sx={{ "&:before": { display: "none" } }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 1.5 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center", width: "100%" }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Roles & Departments
                        </Typography>
                        <Box sx={{ flex: 1 }} />
                        <Chip
                          size="small"
                          variant="outlined"
                          label={`${(formData.assignedTo?.length || 0) + (formData.assignedToTeams?.length || 0)} selected`}
                        />
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: 1.5 }}>
                      <Stack spacing={1}>
                        {(hrState.departments || []).map((dept: any) => (
                          <Accordion key={dept.id} variant="outlined" disableGutters sx={{ "&:before": { display: "none" } }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 1 }}>
                              <Stack direction="row" spacing={1} sx={{ alignItems: "center", width: "100%" }}>
                                <Checkbox
                                  checked={formData.assignedToTeams.includes(dept.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      assignedToTeams: toggleIdInList(prev.assignedToTeams, dept.id, e.target.checked),
                                    }))
                                  }
                                  disabled={formData.isGlobalAccess}
                                  size="small"
                                />
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {dept.name || dept.id}
                                </Typography>
                                <Box sx={{ flex: 1 }} />
                                <Typography variant="caption" color="text.secondary">
                                  {(hrState.roles || []).length} roles
                                </Typography>
                              </Stack>
                            </AccordionSummary>
                            <AccordionDetails sx={{ px: 1 }}>
                              <FormGroup>
                                {(hrState.roles || []).map((role: any) => (
                                  <FormControlLabel
                                    key={`${dept.id}-${role.id}`}
                                    control={
                                      <Checkbox
                                        checked={formData.assignedTo.includes(role.id)}
                                        onChange={(e) =>
                                          setFormData((prev) => ({
                                            ...prev,
                                            assignedTo: toggleIdInList(prev.assignedTo, role.id, e.target.checked),
                                          }))
                                        }
                                        disabled={formData.isGlobalAccess}
                                        size="small"
                                      />
                                    }
                                    label={<Typography variant="body2">{role.label || role.name || role.id}</Typography>}
                                    sx={{ ml: 2 }}
                                  />
                                ))}
                              </FormGroup>
                            </AccordionDetails>
                          </Accordion>
                        ))}
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                </Grid>
              </Grid>
            )}

            {modalTab === 1 && <Grid container spacing={2}>{renderSectionsAndItems()}</Grid>}
          </Box>
        </CRUDModal>
      </Box>
      </RequireCompanyContext>
    </LocalizationProvider>
  )
}

export default ChecklistsPage
