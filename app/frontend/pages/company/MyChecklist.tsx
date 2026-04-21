"use client"
import type React from "react"
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  Alert,
  useTheme,
} from "@mui/material"
import { alpha } from "@mui/material/styles"
import {
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  Close as CloseIcon,
  AccessTime as AccessTimeIcon,
} from "@mui/icons-material"
import { useState, useEffect, useCallback, useMemo } from "react"
import { useCompany, CompanyChecklist, ChecklistCompletion } from "../../../backend/context/CompanyContext"
import { useSettings } from "../../../backend/context/SettingsContext"
import ChecklistCompletionDialog from "../../components/company/ChecklistCompletion"
import DataHeader from "../../components/reusable/DataHeader"
import RequireCompanyContext from "../../components/global/RequireCompanyContext"
import EmptyStateCard from "../../components/reusable/EmptyStateCard"
import {
  checklistIdsEqual,
  getChecklistStatusForUser,
  getChecklistWindowForChecklist,
  getConsecutiveCompletionStreakForUser,
} from "../../../backend/utils/checklistUtils"
import { debugVerbose } from "../../../backend/utils/debugLog"

// Define filter types for checklists
type SortOption = "dueDate" | "priority" | "title" | "category"
type StatusFilter = "all" | "overdue" | "due" | "upcoming" | "completed" | "late" | "expired"

const filterChecklistsByStatus = (
  checklists: CompanyChecklist[],
  completions: ChecklistCompletion[],
  status: string,
  userId: string,
) => {
  return checklists.filter((c) => {
    const s = getChecklistStatusForUser(c, completions, userId)
    return status === "all" || s === status
  })
}

const formatDate = (timestamp: number | Date) => {
  return new Date(timestamp).toLocaleDateString()
}

const formatDateTime = (timestamp: number | Date | undefined) => {
  if (!timestamp) return "N/A"
  return new Date(timestamp).toLocaleString()
}

export type MyChecklistPageProps = {
  mobileESSLayout?: boolean
}

const MyChecklistPage: React.FC<MyChecklistPageProps> = ({ mobileESSLayout = false }) => {
  const theme = useTheme()
  const { state: companyState, fetchChecklists, getChecklistCompletions } = useCompany()
  const { state: settingsState } = useSettings()

  const userId = settingsState.auth?.uid || ""

  // State management
  const [checklists, setChecklists] = useState<CompanyChecklist[]>([])
  const [completions, setCompletions] = useState<ChecklistCompletion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false)
  const [selectedChecklist, setSelectedChecklist] = useState<CompanyChecklist | null>(null)

  // Search, filter and sort state
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<SortOption>("dueDate")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  const loadData = useCallback(async () => {
    if (!companyState.companyID || !companyState.selectedSiteID || !userId) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Use cache + IndexedDB (see CompanyContext.getChecklistCompletions). Force refresh only after submitting a completion.
      const [checklistsData, completionsData] = await Promise.all([
        fetchChecklists(),
        getChecklistCompletions(undefined, false),
      ])

      debugVerbose("MyChecklist: loaded", {
        checklistsCount: checklistsData?.length ?? 0,
        completionsCount: completionsData?.length ?? 0,
      })

      setChecklists(checklistsData || [])
      setCompletions(completionsData || [])
    } catch (err) {
      console.error("ERROR - MyChecklist: Error loading data:", err)
      setError("Failed to load checklists. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, userId, fetchChecklists, getChecklistCompletions])

  useEffect(() => {
    loadData()
  }, [loadData])

  const getAssignedChecklists = useCallback((): CompanyChecklist[] => {
    if (!userId) {
      return []
    }

    return checklists.filter((checklist) => {
      // If global access is enabled, include all checklists
      if (checklist.isGlobalAccess) {
        return true
      }

      const assignments = checklist.assignedTo || []
      // const teamAssignments = checklist.assignedToTeams || []

      // Check if user is directly assigned
      if (assignments.includes(userId)) {
        return true
      }

      // Check if checklist is assigned to current site/subsite
      if (checklist.siteId && companyState.selectedSiteID && checklist.siteId === companyState.selectedSiteID) {
        return true
      }

      if (
        checklist.subsiteId &&
        companyState.selectedSubsiteID &&
        checklist.subsiteId === companyState.selectedSubsiteID
      ) {
        return true
      }

      return false
    })
  }, [checklists, userId, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const assignedChecklists = getAssignedChecklists()
  
  // Use completions loaded directly from getChecklistCompletions() as the primary source
  // This ensures we always have the latest data, especially after refresh
  // Normalize completion data to handle different response formats
  const normalizedCompletions = useMemo(() => {
    return (completions || []).map((c) => {
      // Normalize completion data (same as ChecklistHistory)
      const responses = c.responses || (c as any).fields || (c as any).items || {};
      return {
        ...c,
        responses: typeof responses === 'object' && responses !== null ? responses : {},
        // Preserve status field as-is (don't override)
        status: c.status,
      };
    });
  }, [completions]);
  
  // Filter to only show completions for the current user
  const userCompletions = useMemo(() => {
    return normalizedCompletions.filter((c) => c.completedBy === userId);
  }, [normalizedCompletions, userId]);
  
  // Use userCompletions directly - this is the source of truth loaded from getChecklistCompletions()
  // Calculate stat cards using completions loaded directly from the server
  const overdueChecklists = filterChecklistsByStatus(assignedChecklists, userCompletions, "overdue", userId)
  const dueChecklists = filterChecklistsByStatus(assignedChecklists, userCompletions, "due", userId)
  const upcomingChecklists = filterChecklistsByStatus(assignedChecklists, userCompletions, "upcoming", userId)
  const completedChecklists = filterChecklistsByStatus(assignedChecklists, userCompletions, "completed", userId)
  const lateChecklists = filterChecklistsByStatus(assignedChecklists, userCompletions, "late", userId)
  const expiredChecklists = filterChecklistsByStatus(assignedChecklists, userCompletions, "expired", userId)

  const handleStartChecklist = (checklist: CompanyChecklist) => {
    setSelectedChecklist(checklist)
    setCompletionDialogOpen(true)
  }

  const handleChecklistComplete = async (completion: ChecklistCompletion) => {
    setCompletions((prev) => {
      const existingIndex = prev.findIndex((c) => c.id === completion.id)
      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex] = completion
        return updated
      }
      return [...prev, completion]
    })

    try {
      let completionsData = await getChecklistCompletions(undefined, true)
      if (!completionsData?.some((c) => c.id === completion.id)) {
        await new Promise((r) => setTimeout(r, 400))
        completionsData = await getChecklistCompletions(undefined, true)
      }
      const merged = [...(completionsData || [])]
      if (!merged.some((c) => c.id === completion.id)) {
        merged.push(completion)
      }
      setCompletions(merged)
      debugVerbose("MyChecklist: completion synced", { id: completion.id, total: merged.length })
    } catch (err) {
      console.error("MyChecklist: error reloading completions after complete:", err)
    }

    setCompletionDialogOpen(false)
    setSelectedChecklist(null)

    void loadData()
  }


  const getStatusColor = (status: string) => {
    switch (status) {
      case "overdue":
        return "error"
      case "due":
        return "warning"
      case "upcoming":
        return "info"
      case "completed":
        return "success"
      case "late":
        return "warning"
      case "expired":
        return "error"
      default:
        return "default"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "overdue":
        return <WarningIcon />
      case "due":
        return <ScheduleIcon />
      case "upcoming":
        return <AssignmentIcon />
      case "completed":
        return <CheckCircleIcon />
      case "late":
        return <AccessTimeIcon />
      case "expired":
        return <CloseIcon />
      default:
        return <AssignmentIcon />
    }
  }

  const getScheduleTypeLabel = (type?: string) => {
    switch (String(type || "")) {
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
      case "yearly":
        return "Yearly"
      default:
        return type ? String(type) : "—"
    }
  }

  const renderChecklistCard = (checklist: CompanyChecklist) => {
    // Use userCompletions (loaded directly from server) for status calculation
    const status = getChecklistStatusForUser(checklist, userCompletions, userId)
    const window = getChecklistWindowForChecklist(checklist)
    const streak = getConsecutiveCompletionStreakForUser(checklist, userCompletions, userId)

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
              gridTemplateColumns: { xs: "1fr", md: "minmax(360px, 2.2fr) minmax(260px, 1fr) auto" },
              gap: 1,
              alignItems: "start",
            }}
          >
            {/* Column 1: Title + compact meta */}
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 0.75 }}>
                <Typography variant="subtitle1" sx={{ mb: 0, fontWeight: 700, lineHeight: 1.2 }}>
                  {checklist.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {checklist.category || "General"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ·
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {getScheduleTypeLabel(checklist.schedule?.type)}
                </Typography>
              </Box>
              {checklist.description ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    display: "-webkit-box",
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    mt: 0.25,
                  }}
                >
                  {checklist.description}
                </Typography>
              ) : null}

              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "center", mt: 0.5 }}>
                <Chip
                  icon={getStatusIcon(status)}
                  label={status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  color={getStatusColor(status) as any}
                  size="small"
                />
                {streak > 0 ? (
                  <Typography variant="caption" color="success.main" sx={{ fontWeight: 700 }}>
                    {streak} streak
                  </Typography>
                ) : null}
              </Box>
            </Box>

            {/* Column 2: Open/Due/Expire */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
              <Typography variant="caption" color="text.secondary">
                Open:{" "}
                <Box component="span" sx={{ color: "text.primary", fontWeight: 600 }}>
                  {formatDateTime(window.openingAt)}
                </Box>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Due:{" "}
                <Box component="span" sx={{ color: "text.primary", fontWeight: 600 }}>
                  {formatDateTime(window.closingAt)}
                </Box>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Expire:{" "}
                <Box component="span" sx={{ color: "text.primary", fontWeight: 600 }}>
                  {window.expireAt ? formatDateTime(window.expireAt) : "—"}
                </Box>
              </Typography>
            </Box>

            {/* Column 3: Action */}
            <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", alignSelf: "center" }}>
              {status !== "completed" && status !== "upcoming" ? (
                <Button
                  variant="contained"
                  startIcon={<PlayArrowIcon />}
                  size="small"
                  onClick={() => handleStartChecklist(checklist)}
                  sx={{ minWidth: "auto" }}
                >
                  Start
                </Button>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  {status === "completed" ? "Completed" : "Upcoming"}
                </Typography>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    )
  }

  // No loading indicators — UI renders and fills as data arrives

  return (
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
        title={mobileESSLayout ? "My checklists" : undefined}
        mobileESSLayout={mobileESSLayout}
        showDateControls={false}
        showDateTypeSelector={false}
        searchTerm={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search checklists..."
        filters={[
          {
            label: "Status",
            options: [
              { id: "all", name: "All" },
              { id: "overdue", name: "Overdue" },
              { id: "due", name: "Due Today" },
              { id: "upcoming", name: "Upcoming" },
              { id: "completed", name: "Completed" },
              { id: "late", name: "Late" },
              { id: "expired", name: "Expired" }
            ],
            selectedValues: statusFilter !== "all" ? [statusFilter] : [],
            onSelectionChange: (values) => setStatusFilter(values[0] as StatusFilter || "all")
          },
          {
            label: "Category",
            options: [...new Set(assignedChecklists.map((c) => c.category || "General"))].map(cat => ({ id: cat, name: cat })),
            selectedValues: categoryFilter !== "all" ? [categoryFilter] : [],
            onSelectionChange: (values) => setCategoryFilter(values[0] || "all")
          }
        ]}
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded(!filtersExpanded)}
        sortOptions={[
          { value: "dueDate", label: "Due Date" },
          { value: "priority", label: "Priority" },
          { value: "title", label: "Title" },
          { value: "category", label: "Category" }
        ]}
        sortValue={sortBy}
        sortDirection={sortOrder}
        onSortChange={(value, direction) => {
          setSortBy(value as SortOption)
          setSortOrder(direction)
        }}
        onExportCSV={() => {
          setError("CSV export feature coming soon!")
        }}
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {!companyState.companyID || !companyState.selectedSiteID ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Please select a company and site to view your checklists.
        </Alert>
      ) : (
        <>
          {mobileESSLayout ? (
            <Card
              sx={{
                mb: { xs: 2, sm: 2 },
                borderRadius: { xs: 2, sm: 3 },
                bgcolor: alpha(theme.palette.primary.main, 0.08),
              }}
            >
              <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Grid container spacing={1}>
                  {[
                    {
                      icon: <WarningIcon sx={{ fontSize: { xs: 20, sm: 24 }, color: "error.main", mb: 0.25 }} />,
                      count: overdueChecklists.length,
                      label: "Overdue",
                    },
                    {
                      icon: <ScheduleIcon sx={{ fontSize: { xs: 20, sm: 24 }, color: "warning.main", mb: 0.25 }} />,
                      count: dueChecklists.length,
                      label: "Due today",
                    },
                    {
                      icon: <AssignmentIcon sx={{ fontSize: { xs: 20, sm: 24 }, color: "info.main", mb: 0.25 }} />,
                      count: upcomingChecklists.length,
                      label: "Upcoming",
                    },
                    {
                      icon: <CheckCircleIcon sx={{ fontSize: { xs: 20, sm: 24 }, color: "success.main", mb: 0.25 }} />,
                      count: completedChecklists.length,
                      label: "Completed",
                    },
                    {
                      icon: <AccessTimeIcon sx={{ fontSize: { xs: 20, sm: 24 }, color: "warning.dark", mb: 0.25 }} />,
                      count: lateChecklists.length,
                      label: "Late",
                    },
                    {
                      icon: <CloseIcon sx={{ fontSize: { xs: 20, sm: 24 }, color: "error.main", mb: 0.25 }} />,
                      count: expiredChecklists.length,
                      label: "Expired",
                    },
                  ].map((cell) => (
                    <Grid item xs={4} sm={4} md={2} key={cell.label}>
                      <Box sx={{ textAlign: "center", py: { xs: 0.25, sm: 0.5 } }}>
                        {cell.icon}
                        <Typography
                          variant="h4"
                          sx={{
                            fontWeight: 700,
                            fontSize: { xs: "1.2rem", sm: "1.45rem" },
                            lineHeight: 1.2,
                          }}
                        >
                          {cell.count}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: { xs: "0.6rem", sm: "0.7rem" }, display: "block", lineHeight: 1.2 }}
                        >
                          {cell.label}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          ) : (
            <Grid container spacing={1} sx={{ mb: 2 }}>
              <Grid item xs={6} sm={4} md={2}>
                <Card sx={{ textAlign: "center" }}>
                  <CardContent sx={{ py: 1.25, "&:last-child": { pb: 1.25 } }}>
                    <WarningIcon sx={{ fontSize: 24, color: "error.main", mb: 0.25 }} />
                    <Typography variant="h6" sx={{ fontSize: "1.05rem" }}>
                      {overdueChecklists.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                      Overdue
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Card sx={{ textAlign: "center" }}>
                  <CardContent sx={{ py: 1.25, "&:last-child": { pb: 1.25 } }}>
                    <ScheduleIcon sx={{ fontSize: 24, color: "warning.main", mb: 0.25 }} />
                    <Typography variant="h6" sx={{ fontSize: "1.05rem" }}>
                      {dueChecklists.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                      Due Today
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Card sx={{ textAlign: "center" }}>
                  <CardContent sx={{ py: 1.25, "&:last-child": { pb: 1.25 } }}>
                    <AssignmentIcon sx={{ fontSize: 24, color: "info.main", mb: 0.25 }} />
                    <Typography variant="h6" sx={{ fontSize: "1.05rem" }}>
                      {upcomingChecklists.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                      Upcoming
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Card sx={{ textAlign: "center" }}>
                  <CardContent sx={{ py: 1.25, "&:last-child": { pb: 1.25 } }}>
                    <CheckCircleIcon sx={{ fontSize: 24, color: "success.main", mb: 0.25 }} />
                    <Typography variant="h6" sx={{ fontSize: "1.05rem" }}>
                      {completedChecklists.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                      Completed
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Card sx={{ textAlign: "center" }}>
                  <CardContent sx={{ py: 1.25, "&:last-child": { pb: 1.25 } }}>
                    <AccessTimeIcon sx={{ fontSize: 24, color: "orange", mb: 0.25 }} />
                    <Typography variant="h6" sx={{ fontSize: "1.05rem" }}>
                      {lateChecklists.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                      Late
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Card sx={{ textAlign: "center" }}>
                  <CardContent sx={{ py: 1.25, "&:last-child": { pb: 1.25 } }}>
                    <CloseIcon sx={{ fontSize: 24, color: "error.main", mb: 0.25 }} />
                    <Typography variant="h6" sx={{ fontSize: "1.05rem" }}>
                      {expiredChecklists.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                      Expired
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}


          {/* Filtered and Sorted Checklists */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {(() => {
              // Filter checklists based on search, status, category, and date range
              const filteredChecklists = assignedChecklists.filter((checklist) => {
                const matchesSearch =
                  searchQuery === "" ||
                  checklist.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (checklist.description && checklist.description.toLowerCase().includes(searchQuery.toLowerCase()))

                const checklistStatus = getChecklistStatusForUser(checklist, userCompletions, userId)
                const matchesStatus = statusFilter === "all" || checklistStatus === statusFilter

                const matchesCategory = categoryFilter === "all" || (checklist.category || "General") === categoryFilter

                // Date filtering removed: always show all assigned checklists for "now".
                return matchesSearch && matchesStatus && matchesCategory
              })

              // Sort checklists
              // Status priority order: expired, overdue, due, upcoming, complete
              const getStatusPriority = (status: string): number => {
                switch (status) {
                  case "expired":
                    return 0
                  case "overdue":
                    return 1
                  case "due":
                    return 2
                  case "upcoming":
                    return 3
                  case "completed":
                    return 4
                  case "late":
                    return 1 // Same as overdue
                  default:
                    return 5
                }
              }

              const dir = sortOrder === "asc" ? 1 : -1
              if (sortBy === "title") {
                filteredChecklists.sort((a, b) => a.title.localeCompare(b.title) * dir)
              } else if (sortBy === "category") {
                filteredChecklists.sort(
                  (a, b) => (a.category || "General").localeCompare(b.category || "General") * dir,
                )
              } else if (sortBy === "dueDate") {
                filteredChecklists.sort(
                  (a, b) => (getChecklistWindowForChecklist(a).closingAt.getTime() - getChecklistWindowForChecklist(b).closingAt.getTime()) * dir,
                )
              } else if (sortBy === "priority") {
                // Priority = status priority first, then due date.
                filteredChecklists.sort((a, b) => {
                  const statusA = getChecklistStatusForUser(a, userCompletions, userId)
                  const statusB = getChecklistStatusForUser(b, userCompletions, userId)
                  const priorityA = getStatusPriority(statusA)
                  const priorityB = getStatusPriority(statusB)

                  if (priorityA !== priorityB) return (priorityA - priorityB) * dir
                  const dueA = getChecklistWindowForChecklist(a).closingAt.getTime()
                  const dueB = getChecklistWindowForChecklist(b).closingAt.getTime()
                  return (dueA - dueB) * dir
                })
              } else {
                // Safe fallback: priority ordering
                filteredChecklists.sort((a, b) => {
                  const statusA = getChecklistStatusForUser(a, userCompletions, userId)
                  const statusB = getChecklistStatusForUser(b, userCompletions, userId)
                  return (getStatusPriority(statusA) - getStatusPriority(statusB)) * dir
                })
              }

              if (filteredChecklists.length === 0) {
                return (
                  <EmptyStateCard
                    icon={AssignmentIcon}
                    title="No checklists found"
                    description="Try adjusting your filters or search query"
                  />
                )
              }

              return filteredChecklists.map((checklist) => renderChecklistCard(checklist))
            })()}
          </Box>

          {/* Completion Dialog */}
          {selectedChecklist && (
            <ChecklistCompletionDialog
              open={completionDialogOpen}
              onClose={() => {
                setCompletionDialogOpen(false)
                setSelectedChecklist(null)
              }}
              checklist={selectedChecklist}
              onComplete={handleChecklistComplete}
            />
          )}

        </>
      )}
    </Box>
    </RequireCompanyContext>
  )
}

export default MyChecklistPage
