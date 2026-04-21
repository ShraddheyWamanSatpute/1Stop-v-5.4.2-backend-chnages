"use client"
import { useLocation } from "react-router-dom"

import React, { useEffect, useState, useCallback, useMemo } from "react"
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  Chip,
  Grid,
  Stack,
  Divider,
  Link,
  Button,
  IconButton,
} from "@mui/material"
import {
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Close as CloseIcon,
  AccessTime as AccessTimeIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material"
import { useCompany } from "../../../backend/context/CompanyContext"
import type { CompanyChecklist, ChecklistCompletion, ItemResponse, UserProfile } from "../../../backend/interfaces/Company"
import { formatDateTime, getChecklistWindowForChecklist } from "../../../backend/utils/checklistUtils"
import { format } from "date-fns"
import DataHeader from "../../components/reusable/DataHeader"
import EmptyStateCard from "../../components/reusable/EmptyStateCard"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../components/reusable/CRUDModal"
import { db, onValue, ref } from "../../../backend/services/Firebase"

type StatusFilter = "all" | "completed" | "in_progress" | "overdue" | "late" | "expired"
type SortOption = "completedAt" | "title" | "status" | "score" | "open" | "due" | "expire"

// Simple in-memory cache for user profiles to avoid refetching
const userProfileCache: Record<string, UserProfile> = {}

// Utility to ensure unique, non-empty keys
const ensureUniqueKey = (baseKey: string | undefined | null, prefix: string, index?: number): string => {
  // Handle empty/null/undefined keys
  if (!baseKey || String(baseKey).trim() === '') {
    const uniqueSuffix = index !== undefined ? index : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    return `${prefix}-${uniqueSuffix}`
  }
  
  // Ensure key is a string and sanitize it
  let key = String(baseKey).trim()
  
  // If key is still empty after sanitization, generate one
  if (key === '') {
    const uniqueSuffix = index !== undefined ? index : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    return `${prefix}-${uniqueSuffix}`
  }
  
  // Check if key already starts with the prefix to avoid double-prefixing
  const alreadyPrefixed = key.startsWith(`${prefix}-`)
  
  // Always prefix the key to ensure uniqueness and avoid conflicts with common words
  // Include index if provided to ensure uniqueness within arrays
  if (index !== undefined) {
    // If already prefixed, just append index, otherwise add full prefix
    key = alreadyPrefixed ? `${key}-${index}` : `${prefix}-${key}-${index}`
  } else {
    // For non-array items, prefix to avoid conflicts with common words like "status"
    // But only if not already prefixed
    if (!alreadyPrefixed && (key === 'status' || key === 'id' || key === 'key' || key.length < 3 || !key.includes('-'))) {
      key = `${prefix}-${key}`
    }
  }
  
  return key
}

const ChecklistHistoryPage: React.FC = () => {
  const location = useLocation()
  const {
    state: companyState,
    fetchChecklists,
    getChecklistCompletions,
    deleteChecklistCompletion,
    fetchUserProfile,
  } = useCompany()

  // Use checklists and completions from context (pre-loaded for instant UI)
  // But also load directly to ensure we have the latest data, especially after new completions
  const [checklists, setChecklists] = useState<CompanyChecklist[]>(companyState.checklists || [])
  const [completions, setCompletions] = useState<ChecklistCompletion[]>(companyState.checklistCompletions || [])
  const [loading, setLoading] = useState(false)
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({})
  const [error, setError] = useState<string | null>(null)

  // Load data directly to ensure we have the latest completions
  // This is especially important after new completions are created
  // Uses the same company context methods as MyChecklist to ensure consistency
  const loadData = useCallback(async () => {
    if (!companyState.companyID || !companyState.selectedSiteID) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Use the same methods as MyChecklist: fetchChecklists() and getChecklistCompletions()
      // Always fetch fresh data to ensure we have the latest completions
      const [checklistsData, completionsData] = await Promise.all([
        fetchChecklists(),
        getChecklistCompletions() // Always fetch fresh (cache is handled in context)
      ])

      setChecklists(checklistsData || [])
      setCompletions(completionsData || [])
    } catch (err) {
      console.error("ERROR - ChecklistHistory: Error loading data:", err)
      setError("Failed to load checklist history")
      // Fallback to context data if direct load fails
      setChecklists(companyState.checklists || [])
      setCompletions(companyState.checklistCompletions || [])
    } finally {
      setLoading(false)
    }
  }, [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, fetchChecklists, getChecklistCompletions, companyState.checklists, companyState.checklistCompletions])

  // Load data on mount and when company/site changes
  useEffect(() => {
    loadData()
  }, [loadData])

  // Live-refresh checklist completions (history) from RTDB.
  // We listen to the most relevant completion paths (subsite + site + company fallbacks) and merge/dedupe.
  useEffect(() => {
    if (!companyState.companyID) return
    if (!companyState.selectedSiteID) return

    const companyId = companyState.companyID
    const siteId = companyState.selectedSiteID
    const subsiteId = companyState.selectedSubsiteID

    const bases: string[] = []
    if (subsiteId) bases.push(`companies/${companyId}/sites/${siteId}/subsites/${subsiteId}`)
    bases.push(`companies/${companyId}/sites/${siteId}`)
    bases.push(`companies/${companyId}`)

    const toCompletionsArray = (raw: any): ChecklistCompletion[] => {
      if (!raw || typeof raw !== "object") return []

      // Legacy flat shape: checklistCompletions/{completionId} -> { checklistId, ... }
      const firstKey = Object.keys(raw || {})[0]
      const firstVal = firstKey ? raw[firstKey] : null
      const looksLikeCompletion =
        firstVal &&
        typeof firstVal === "object" &&
        (typeof (firstVal as any).completedAt === "number" ||
          typeof (firstVal as any).checklistId === "string" ||
          typeof (firstVal as any).completedBy === "string")

      if (looksLikeCompletion) {
        return Object.keys(raw).map((id) => {
          const completion = raw[id] as any
          return {
            id,
            ...completion,
            responses: completion.responses || completion.fields || completion.items || {},
          } as any
        })
      }

      // Grouped shape: checklistCompletions/{checklistId}/{completionId} -> { ... }
      const all: ChecklistCompletion[] = []
      Object.keys(raw).forEach((checklistIdKey) => {
        const checklistCompletions = raw[checklistIdKey]
        if (!checklistCompletions || typeof checklistCompletions !== "object") return
        Object.keys(checklistCompletions).forEach((completionId) => {
          if (
            completionId === "responses" ||
            completionId === "status" ||
            completionId === "completedAt" ||
            completionId === "completedBy" ||
            completionId === "overallNotes" ||
            completionId === "signature" ||
            completionId.length < 10
          ) {
            return
          }
          const completionData = (checklistCompletions as any)[completionId]
          if (
            completionData &&
            typeof completionData === "object" &&
            (typeof completionData.completedAt === "number" || typeof completionData.completedBy === "string")
          ) {
            all.push({
              ...completionData,
              id: completionId,
              checklistId: checklistIdKey,
              responses: completionData.responses || completionData.fields || completionData.items || {},
            } as any)
          }
        })
      })
      return all
    }

    const seen = new Map<string, ChecklistCompletion>()
    const applyMerged = () => {
      setCompletions(Array.from(seen.values()))
    }

    const unsubs = bases.map((base) => {
      const completionsPath = `${base}/checklistCompletions`
      return onValue(
        ref(db, completionsPath),
        (snap) => {
          const raw = snap.val()
          const arr = toCompletionsArray(raw)
          // Rebuild map entries from this path (best-effort: merge by id)
          arr.forEach((c: any) => {
            const id = String(c?.id || "")
            if (!id) return
            if (!seen.has(id)) seen.set(id, c)
            else {
              // Prefer the record with the latest updatedAt/completedAt.
              const prev: any = seen.get(id)
              const prevT = Number(prev?.updatedAt || prev?.completedAt || 0)
              const nextT = Number(c?.updatedAt || c?.completedAt || 0)
              if (nextT >= prevT) seen.set(id, c)
            }
          })
          applyMerged()
        },
        () => {
          // ignore listener error; history still has one-time load + context cache
        },
      )
    })

    return () => {
      unsubs.forEach((u) => u && u())
    }
  }, [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID])

  // Also sync with context updates (for when context refreshes)
  useEffect(() => {
    if (companyState.checklists && companyState.checklists.length > 0) {
      setChecklists(companyState.checklists)
    }
  }, [companyState.checklists])

  useEffect(() => {
    if (companyState.checklistCompletions && companyState.checklistCompletions.length > 0) {
      setCompletions(companyState.checklistCompletions)
    }
  }, [companyState.checklistCompletions])

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [userFilter, setUserFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<SortOption>("completedAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [selectedCompletion, setSelectedCompletion] = useState<ChecklistCompletion | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState<number>(50)

  const handleDeleteHistory = useCallback(
    async (completion: ChecklistCompletion) => {
      const checklistId = String((completion as any)?.checklistId || "")
      const completionId = String((completion as any)?.id || "")
      if (!checklistId || !completionId) return
      if (!window.confirm("Delete this history entry? This cannot be undone.")) return

      try {
        await deleteChecklistCompletion(checklistId, completionId)
        // Ensure UI reflects latest DB state across any paths.
        await loadData()
      } catch (err) {
        console.error("Error deleting checklist history:", err)
        setError("Failed to delete history entry")
      }
    },
    [deleteChecklistCompletion, loadData],
  )


  // Fast case-insensitive lookup map (avoids Object.keys scans for each completion)
  const checklistsByIdLower = useMemo(() => {
    const map: Record<string, CompanyChecklist> = {}
    ;(checklists || []).forEach((cl) => {
      const id = String((cl as any)?.id ?? "").trim()
      if (!id) return
      map[id.toLowerCase()] = cl
    })
    return map
  }, [checklists])

  const getChecklistForCompletion = useCallback((checklistId: unknown): CompanyChecklist | undefined => {
    const id = String(checklistId ?? "").trim().toLowerCase()
    if (!id) return undefined
    return checklistsByIdLower[id]
  }, [checklistsByIdLower])

  const getUserDisplayName = (userId: string): string => {
    const profile = userProfiles[userId]
    if (!profile) return userId || "Unknown"
    if (profile.firstName || profile.lastName) {
      return `${profile.firstName || ""} ${profile.lastName || ""}`.trim()
    }
    if (profile.displayName) {
      return profile.displayName
    }
    return profile.email || userId || "Unknown"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "success"
      case "late":
        return "warning"
      case "overdue":
      case "expired":
        return "error"
      case "in_progress":
        return "info"
      default:
        return "default"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircleIcon />
      case "late":
      case "in_progress":
        return <AccessTimeIcon />
      case "overdue":
        return <WarningIcon />
      case "expired":
        return <CloseIcon />
      default:
        return <AssignmentIcon />
    }
  }

  const getDisplayStatus = useCallback((completion: ChecklistCompletion): StatusFilter => {
    const raw = String((completion as any)?.status || "").trim().toLowerCase()
    if (raw === "completed" || raw === "in_progress" || raw === "overdue" || raw === "late" || raw === "expired") {
      return raw as StatusFilter
    }
    // Legacy flag
    if ((completion as any)?.isLate) return "late"
    // Safe fallback so UI never crashes on bad records
    return "completed"
  }, [])

  const renderResponseCard = (checklist: CompanyChecklist | undefined, itemId: string, response: ItemResponse) => {
    if (!checklist) {
      return (
        <Box
          sx={{
            px: 1,
            py: 0.5,
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {itemId}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "right", whiteSpace: "nowrap" }}>
            {String(response.value ?? "")}
          </Typography>
        </Box>
      )
    }

    // Find the matching item by ID (taking into account sanitised IDs in responses)
    const sections = checklist.sections || []
    const allItems = sections.flatMap((s) => s.items || [])
    const item = allItems.find((i) => {
      if (!i.id) return false
      const sanitisedId = i.id.replace(/[.#$\[\]/]/g, "_")
      return i.id === itemId || sanitisedId === itemId
    })

    const label = item?.title || itemId

    const getAcceptableText = () => {
      const opts: any = (item as any)?.options
      if (!opts || typeof opts !== "object") return ""
      const unit = opts.unit ? ` ${String(opts.unit)}` : ""
      const min = opts.minValue
      const max = opts.maxValue
      if (min !== undefined && max !== undefined) return `Acceptable: ${min}–${max}${unit}`
      if (min !== undefined) return `Acceptable: ≥${min}${unit}`
      if (max !== undefined) return `Acceptable: ≤${max}${unit}`
      return ""
    }

    let valueDisplay: React.ReactNode = ""
    let hasWarning = false
    let warningMessage = ""

    switch (response.type) {
      case "checkbox":
      case "yesno":
        valueDisplay = response.value === true ? "Yes" : response.value === false ? "No" : "Not answered"
        break
      case "number":
        valueDisplay = response.value ?? ""
        if (response.isOutOfRange) {
          hasWarning = true
          warningMessage = `Out of acceptable range`
        } else if (response.warningLevel === "critical") {
          hasWarning = true
          warningMessage = "Critical threshold reached"
        } else if (response.warningLevel === "warning") {
          hasWarning = true
          warningMessage = "Warning threshold reached"
        }
        break
      case "text":
        valueDisplay = response.value ?? ""
        break
      case "file":
      case "photo":
        valueDisplay = `${response.photos?.length || 0} photo(s)`
        break
      case "multiple_entry": {
        const entries = Array.isArray(response.value) ? response.value : []
        valueDisplay = `${entries.length} log entr${entries.length === 1 ? "y" : "ies"}`
        break
      }
      default:
        valueDisplay = String(response.value ?? "")
    }

    return (
      <Box
        sx={{
          px: 1,
          py: 0.5,
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "minmax(220px, 1.2fr) minmax(0, 1fr)" },
          alignItems: "center",
          gap: 1,
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2, minWidth: 0 }}>
          {label}
        </Typography>
        <Typography
          variant="body2"
          color={hasWarning ? "warning.main" : "text.secondary"}
          sx={{
            textAlign: { xs: "left", sm: "right" },
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={`${String(valueDisplay ?? "")}${
            hasWarning
              ? ` (${warningMessage}${getAcceptableText() ? ` — ${getAcceptableText()}` : ""}${response.explanation ? ` — ${response.explanation}` : ""})`
              : ""
          }`}
        >
          {String(valueDisplay ?? "")}
          {hasWarning
            ? ` (${warningMessage}${getAcceptableText() ? ` — ${getAcceptableText()}` : ""}${response.explanation ? ` — ${response.explanation}` : ""})`
            : ""}
        </Typography>
      </Box>
    )
  }

  // Process completions exactly like MyChecklist - use useMemo directly, no deferring
  const processedCompletions = useMemo(() => {
    if (!completions || completions.length === 0) return []
    
    try {
      // Normalize completions (same pattern as MyChecklist)
      const normalized = completions.map((completion) => {
        const responses = completion.responses || (completion as any).fields || (completion as any).items || {};
        return {
          ...completion,
          responses: typeof responses === 'object' && responses !== null ? responses : {},
        };
      });

      // Filter and sort
      let list = [...normalized]

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        list = list.filter((completion) => {
          const checklist = getChecklistForCompletion(completion.checklistId)
          const title = checklist?.title?.toLowerCase() || ""
          const description = checklist?.description?.toLowerCase() || ""
          const category = checklist?.category?.toLowerCase() || ""
          const completedByName = getUserDisplayName(completion.completedBy).toLowerCase()
          return (
            title.includes(q) ||
            description.includes(q) ||
            category.includes(q) ||
            completedByName.includes(q) ||
            completion.completedBy?.toLowerCase().includes(q)
          )
        })
      }

      if (statusFilter !== "all") {
        list = list.filter((c) => getDisplayStatus(c) === statusFilter)
      }

      if (categoryFilter !== "all") {
        list = list.filter((c) => {
          const checklist = getChecklistForCompletion(c.checklistId)
          return (checklist?.category || "") === categoryFilter
        })
      }

      if (userFilter !== "all") {
        list = list.filter((c) => c.completedBy === userFilter)
      }

      list.sort((a, b) => {
        const checklistA = getChecklistForCompletion(a.checklistId)
        const checklistB = getChecklistForCompletion(b.checklistId)
        const dir = sortOrder === "asc" ? 1 : -1

        switch (sortBy) {
          case "title":
            return (checklistA?.title || "").localeCompare(checklistB?.title || "") * dir
          case "status":
            return getDisplayStatus(a).localeCompare(getDisplayStatus(b)) * dir
          case "score":
            return ((a.completionScore || 0) - (b.completionScore || 0)) * dir
          case "open": {
            const wa = checklistA ? getChecklistWindowForChecklist(checklistA, { instanceDate: (a as any).scheduledFor ?? null }) : null
            const wb = checklistB ? getChecklistWindowForChecklist(checklistB, { instanceDate: (b as any).scheduledFor ?? null }) : null
            const av = wa ? wa.openingAt.getTime() : 0
            const bv = wb ? wb.openingAt.getTime() : 0
            return (av - bv) * dir
          }
          case "due": {
            const wa = checklistA ? getChecklistWindowForChecklist(checklistA, { instanceDate: (a as any).scheduledFor ?? null }) : null
            const wb = checklistB ? getChecklistWindowForChecklist(checklistB, { instanceDate: (b as any).scheduledFor ?? null }) : null
            const av = wa ? wa.closingAt.getTime() : 0
            const bv = wb ? wb.closingAt.getTime() : 0
            return (av - bv) * dir
          }
          case "expire": {
            const wa = checklistA ? getChecklistWindowForChecklist(checklistA, { instanceDate: (a as any).scheduledFor ?? null }) : null
            const wb = checklistB ? getChecklistWindowForChecklist(checklistB, { instanceDate: (b as any).scheduledFor ?? null }) : null
            const av = wa?.expireAt ? wa.expireAt.getTime() : Number.POSITIVE_INFINITY
            const bv = wb?.expireAt ? wb.expireAt.getTime() : Number.POSITIVE_INFINITY
            return (av - bv) * dir
          }
          case "completedAt":
          default:
            return (a.completedAt - b.completedAt) * dir
        }
      })

      return list
    } catch (error) {
      console.error("Error processing completions:", error)
      return []
    }
  }, [completions, getChecklistForCompletion, getDisplayStatus, searchQuery, statusFilter, categoryFilter, userFilter, sortBy, sortOrder, userProfiles])

  // Windowed rendering: keep initial DOM tiny so refresh/navigation never freezes
  useEffect(() => {
    setVisibleCount(50)
  }, [searchQuery, statusFilter, categoryFilter, userFilter, sortBy, sortOrder, completions.length])

  const visibleCompletions = useMemo(() => {
    return processedCompletions.slice(0, visibleCount)
  }, [processedCompletions, visibleCount])

  // Load user profiles in background - completely non-blocking, UI renders instantly
  useEffect(() => {
    // Only fetch profiles for visible rows to avoid massive background churn
    if (!visibleCompletions || visibleCompletions.length === 0) return

    const uniqueUserIds = [...new Set(visibleCompletions.map((c) => c.completedBy).filter(Boolean))]
    if (uniqueUserIds.length === 0) return
    
    // Defer ALL profile loading to next tick - UI renders first
    setTimeout(() => {
      const cachedProfiles: Record<string, UserProfile> = {}
      const uncachedUserIds: string[] = []
      
      uniqueUserIds.forEach((userId) => {
        if (userProfileCache[userId]) {
          cachedProfiles[userId] = userProfileCache[userId]
        } else if (!userProfiles[userId]) {
          uncachedUserIds.push(userId)
        }
      })
      
      // Set cached profiles (non-blocking)
      if (Object.keys(cachedProfiles).length > 0) {
        setUserProfiles((prev) => ({ ...prev, ...cachedProfiles }))
      }
      
      // Fetch uncached profiles in background (batched, non-blocking)
      if (uncachedUserIds.length > 0) {
        const BATCH_SIZE = 10
        const batches = []
        for (let i = 0; i < uncachedUserIds.length; i += BATCH_SIZE) {
          batches.push(uncachedUserIds.slice(i, i + BATCH_SIZE))
        }
        
        batches.forEach((batch, batchIndex) => {
          setTimeout(() => {
            Promise.all(
              batch.map(async (userId) => {
                try {
                  const profile = await fetchUserProfile(userId)
                  if (profile) {
                    userProfileCache[userId] = profile
                    setUserProfiles((prev) => ({ ...prev, [userId]: profile }))
                  }
                } catch (err) {
                  // Silent fail - profiles load progressively
                }
              })
            )
          }, batchIndex * 50) // Stagger batches to avoid blocking
        })
      }
    }, 0) // Defer to next tick - UI renders first
  }, [visibleCompletions, userProfiles])

  // Render UI instantly like ScheduleManager - no blocking
  return (
    <Box sx={{ p: 0 }}>
      <DataHeader
        onRefresh={loadData}
        showDateControls={false}
        searchTerm={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by checklist, category, description or user..."
        filters={[
          {
            label: "Status",
            options: [
              { id: "all", name: "All Statuses" },
              { id: "completed", name: "Completed" },
              { id: "late", name: "Late" },
              { id: "overdue", name: "Overdue" },
              { id: "expired", name: "Expired" },
              { id: "in_progress", name: "In Progress" }
            ],
            selectedValues: statusFilter !== "all" ? [statusFilter] : [],
            onSelectionChange: (values) => setStatusFilter(values[0] as StatusFilter || "all")
          },
          {
            label: "Category",
            options: useMemo(() => {
              if (!checklists || checklists.length === 0) return [{ id: "all", name: "All Categories" }]
              const categories = Array.from(new Set(checklists.map(c => c.category).filter(Boolean)))
              return [
                { id: "all", name: "All Categories" },
                ...categories.map(cat => ({ id: cat, name: cat }))
              ]
            }, [checklists]),
            selectedValues: categoryFilter !== "all" ? [categoryFilter] : [],
            onSelectionChange: (values) => setCategoryFilter(values[0] || "all")
          },
          {
            label: "User",
            options: useMemo(() => {
              if (!completions || completions.length === 0) return [{ id: "all", name: "All Users" }]
              const userIds = Array.from(new Set(completions.map(c => c.completedBy).filter(Boolean)))
              return [
                { id: "all", name: "All Users" },
                ...userIds.map(uid => ({ id: uid, name: getUserDisplayName(uid) }))
              ]
            }, [completions, userProfiles]),
            selectedValues: userFilter !== "all" ? [userFilter] : [],
            onSelectionChange: (values) => setUserFilter(values[0] || "all")
          }
        ]}
        sortOptions={[
          { value: "completedAt", label: "Completed Date" },
          { value: "title", label: "Checklist Title" },
          { value: "status", label: "Status" },
          { value: "score", label: "Score" },
          { value: "open", label: "Open" },
          { value: "due", label: "Due" },
          { value: "expire", label: "Expire" },
        ]}
        sortValue={sortBy}
        sortDirection={sortOrder}
        onSortChange={(value, direction) => {
          setSortBy(value as SortOption)
          setSortOrder(direction)
        }}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2, mx: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Show loading state if initial load */}
      {loading && completions.length === 0 ? (
        <Box sx={{ p: 3, textAlign: "center" }}>
          <Typography>Loading checklist history...</Typography>
        </Box>
      ) : processedCompletions.length === 0 ? (
        <EmptyStateCard
          icon={AssignmentIcon}
          title="No checklist completions found"
          description="Try adjusting your search or filters."
        />
      ) : (
        <Stack spacing={1}>
          {visibleCompletions.map((completion, index) => {
            const checklist = getChecklistForCompletion(completion.checklistId)
            const checklistTitle = checklist?.title || `Checklist ${String(completion.checklistId ?? "Unknown")}`
            const checklistCategory = checklist?.category || ""
            const checklistDescription = checklist?.description || ""
            const displayStatus = getDisplayStatus(completion)
            const w = checklist
              ? getChecklistWindowForChecklist(checklist, { instanceDate: (completion as any)?.scheduledFor ?? null })
              : null
            const openLabel = w?.openingAt ? formatDateTime(w.openingAt.getTime()) : "-"
            const dueLabel = w?.closingAt ? formatDateTime(w.closingAt.getTime()) : "-"
            const expireLabel = w?.expireAt ? formatDateTime(w.expireAt.getTime()) : "—"
            // Ensure we have a unique key - use completion.id if available, otherwise use index + timestamp
            const baseKey = completion.id || `completion-${index}-${completion.completedAt || Date.now()}`
            const uniqueKey = ensureUniqueKey(baseKey, 'completion', index)

            return (
              <Card
                key={uniqueKey}
                variant="outlined"
                sx={{ cursor: "pointer" }}
                onClick={() => {
                  setSelectedCompletion(completion)
                  setDetailsDialogOpen(true)
                }}
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
                    {/* Column 1: Title/meta */}
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ mb: 0, fontWeight: 700, lineHeight: 1.2 }}>
                        {checklistTitle}
                      </Typography>
                      {checklistDescription ? (
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
                          {checklistDescription}
                        </Typography>
                      ) : null}
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "center", mt: 0.25 }}>
                        <Chip
                          icon={getStatusIcon(displayStatus)}
                          label={displayStatus.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                          color={getStatusColor(displayStatus) as any}
                          size="small"
                        />
                        <Typography variant="caption" color="text.secondary">
                          {checklistCategory || "Uncategorised"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Completed: {formatDateTime(completion.completedAt)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          By: {getUserDisplayName(completion.completedBy)}
                        </Typography>
                        {typeof completion.completionScore === "number" ? (
                          <Typography variant="caption" color="text.secondary">
                            Score: {completion.completionScore}%
                          </Typography>
                        ) : null}
                      </Box>
                    </Box>

                    {/* Column 2: Schedule window */}
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                      <Typography variant="caption" color="text.secondary">
                        Open:{" "}
                        <Box component="span" sx={{ color: "text.primary", fontWeight: 600 }}>
                          {openLabel}
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
                    <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.25 }}>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteHistory(completion)
                        }}
                        sx={{ p: 0.5 }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )
          })}
          {processedCompletions.length > visibleCount && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <Button variant="outlined" onClick={() => setVisibleCount((c) => c + 50)}>
                Load more ({processedCompletions.length - visibleCount} remaining)
              </Button>
            </Box>
          )}
        </Stack>
      )}

      {/* Details Modal */}
                        <CRUDModal
              open={detailsDialogOpen}
              onClose={(reason) => {
                setDetailsDialogOpen(false)
                if (isCrudModalHardDismiss(reason)) {
                  const __workspaceOnClose = () => setDetailsDialogOpen(false)
                  if (typeof __workspaceOnClose === "function") {
                    __workspaceOnClose(reason)
                  }
                }
              }}
              workspaceFormShortcut={{
                crudEntity: "checklistHistoryModal1",
                crudMode: "view",
              }}
              title={selectedCompletion
            ? (getChecklistForCompletion(selectedCompletion.checklistId)?.title ||
              `Checklist ${String(selectedCompletion.checklistId ?? "Unknown")}`)
            : ""}
              subtitle={selectedCompletion ? `Completed ${formatDateTime(selectedCompletion.completedAt)}` : undefined}
              mode="view"
              maxWidth="md"
              dialogSx={{ zIndex: (theme) => (theme.zIndex.modal || 1300) + 200 }}
              topBarActions={selectedCompletion ? (
            <IconButton
              size="small"
              title="Delete history entry"
              onClick={() => handleDeleteHistory(selectedCompletion)}
              sx={{ color: "inherit" }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          ) : null}
            >
        {selectedCompletion && (() => {
          const completionId = ensureUniqueKey(selectedCompletion.id, 'completion', selectedCompletion.completedAt)
          const dialogUniqueKey = completionId || `dialog-${selectedCompletion.completedAt || Date.now()}-${Math.random()}`
          return (
            <Box>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "repeat(5, minmax(0, 1fr))" },
                  gap: 1,
                  mb: 1,
                  alignItems: "start",
                }}
              >
                <Box key={ensureUniqueKey(`${dialogUniqueKey}-status`, "dialog-status")}>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      icon={getStatusIcon(selectedCompletion.status)}
                      label={selectedCompletion.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      color={getStatusColor(selectedCompletion.status) as any}
                      size="small"
                    />
                  </Box>
                </Box>
                <Box key={ensureUniqueKey(`${dialogUniqueKey}-completed-by`, "dialog-completed-by")}>
                  <Typography variant="caption" color="text.secondary">Completed By</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {getUserDisplayName(selectedCompletion.completedBy)}
                  </Typography>
                </Box>
                <Box key={ensureUniqueKey(`${dialogUniqueKey}-completed-date`, "dialog-completed-date")}>
                  <Typography variant="caption" color="text.secondary">Completed Date</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {format(new Date(selectedCompletion.completedAt), "dd MMM yyyy")}
                  </Typography>
                </Box>
                <Box key={ensureUniqueKey(`${dialogUniqueKey}-completed-time`, "dialog-completed-time")}>
                  <Typography variant="caption" color="text.secondary">Completed Time</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {format(new Date(selectedCompletion.completedAt), "HH:mm")}
                  </Typography>
                </Box>
                <Box key={ensureUniqueKey(`${dialogUniqueKey}-score`, "dialog-score")}>
                  <Typography variant="caption" color="text.secondary">Score</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {selectedCompletion.completionScore || 0}%
                  </Typography>
                </Box>
              </Box>
              {selectedCompletion.overallNotes ? (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">Notes</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {selectedCompletion.overallNotes}
                  </Typography>
                </Box>
              ) : null}

              <Divider sx={{ my: 1.5 }} />

              <Typography variant="subtitle2" sx={{ mb: 1 }}>Responses</Typography>
              {selectedCompletion.responses && Object.entries(selectedCompletion.responses).map(([itemId, response], idx) => (
                <Box key={ensureUniqueKey(`${dialogUniqueKey}-${itemId}`, 'dialog-response', idx)} sx={{ mb: 0.5 }}>
                  {renderResponseCard(getChecklistForCompletion(selectedCompletion.checklistId), itemId, response as ItemResponse)}
                </Box>
              ))}
            </Box>
          )
        })()}
      </CRUDModal>
    </Box>
  )
}

export default ChecklistHistoryPage

