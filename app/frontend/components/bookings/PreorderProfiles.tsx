"use client"
import { useLocation } from "react-router-dom"

import type React from "react"
import { useEffect, useState, useMemo, useRef } from "react"
import { debugWarn } from "../../../utils/debugLog"
import { Box, Typography, Grid, Card, CardContent, IconButton, Alert, Tooltip } from "@mui/material"
import { Delete as DeleteIcon, Edit as EditIcon, Visibility as VisibilityIcon, Restaurant as RestaurantIcon, Bookmark as BookmarkIcon } from "@mui/icons-material"
import { useBookings as useBookingsContext } from "../../../backend/context/BookingsContext"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import PreorderProfileForm from "./forms/PreorderProfileForm"
import DataHeader from "../reusable/DataHeader"
import { usePermission } from "../../hooks/usePermission"
import EmptyStateCard from "../reusable/EmptyStateCard"


interface PreorderCourseItem { itemId: string; required?: boolean; perPerson?: boolean; quantityPerPerson?: number }
interface PreorderCourse { id?: string; name: string; courseId?: string; minPerPerson?: number; maxPerPerson?: number; items: PreorderCourseItem[] }
interface PreorderProfile { id?: string; name: string; description?: string; courses: PreorderCourse[]; createdAt?: string; updatedAt?: string }

const PreorderProfiles: React.FC = () => {
  const location = useLocation()
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("bookings", "preorders")
  const canRemove = canDelete("bookings", "preorders")
  const { 
    basePath, 
    fetchPreorderProfiles, 
    savePreorderProfile, 
    deletePreorderProfile
  } = useBookingsContext()
  const [error, setError] = useState<string | null>(null)

  const [profiles, setProfiles] = useState<PreorderProfile[]>([])
  
  // CRUD form states
  const [profileFormOpen, setProfileFormOpen] = useState(false)
  const [profileFormMode, setProfileFormMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedProfileForForm, setSelectedProfileForForm] = useState<PreorderProfile | null>(null)
  const [sortBy, setSortBy] = useState("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [searchTerm, setSearchTerm] = useState("")

  // Track if we've already loaded to prevent duplicate calls
  const hasLoadedRef = useRef(false)
  const lastBasePathRef = useRef<string | null>(null)
  
  useEffect(() => {
    // Reset hasLoadedRef if basePath changed
    if (lastBasePathRef.current !== basePath) {
      hasLoadedRef.current = false
      lastBasePathRef.current = basePath || null
    }
    
    const load = async () => {
      if (!basePath || hasLoadedRef.current) return
      hasLoadedRef.current = true
      setError(null)
      try {
        // Load preorder profiles
        const profilesData = await fetchPreorderProfiles()
        setProfiles(profilesData || [])
      } catch (e) {
        debugWarn("Error loading preorder profiles data:", e)
        setError("Failed to load data")
        hasLoadedRef.current = false // Allow retry on error
      }
    }
    load()
  }, [basePath, fetchPreorderProfiles])

  // Sort options for preorder profiles
  const sortOptions = [
    { value: "name", label: "Name" },
    { value: "description", label: "Description" },
  ]

  // Filter and sort preorder profiles
  const filteredAndSortedProfiles = useMemo(() => {
    return [...profiles]
      .filter((profile) => {
        const query = searchTerm.trim().toLowerCase()
        if (!query) return true
        return (
          (profile.name || "").toLowerCase().includes(query) ||
          (profile.description || "").toLowerCase().includes(query)
        )
      })
      .sort((a, b) => {
      let aValue = ""
      let bValue = ""

      switch (sortBy) {
        case "name":
          aValue = a.name || ""
          bValue = b.name || ""
          break
        case "description":
          aValue = a.description || ""
          bValue = b.description || ""
          break
        default:
          aValue = a.name || ""
          bValue = b.name || ""
      }

      const comparison = aValue.localeCompare(bValue)
        return sortDirection === "asc" ? comparison : -comparison
      })
  }, [profiles, searchTerm, sortBy, sortDirection])

  // No category/subcategory filters anymore; keep full list available



  const handleDelete = async (id?: string) => {
    if (!canRemove) return
    if (!id || !basePath) return
    setError(null)
    try {
      await deletePreorderProfile(id)
      
      // Refresh the profiles list
      const updatedProfiles = await fetchPreorderProfiles()
      setProfiles(updatedProfiles || [])
    } catch (e) {
      debugWarn("Error deleting preorder profile:", e)
      setError("Failed to delete profile")
    }
  }

  // CRUD form handlers
  const handleOpenProfileForm = (profile: PreorderProfile | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    if ((mode === "create" || mode === "edit") && !canMutate) return
    setSelectedProfileForForm(profile)
    setProfileFormMode(mode)
    setProfileFormOpen(true)
  }

  const handleCloseProfileForm = () => {
    setProfileFormOpen(false)
    setSelectedProfileForForm(null)
  }

  const handleSaveProfile = async (profileData: any) => {
    if (!canMutate) return
    try {
      if (profileFormMode === 'create') {
        // Filter out undefined values before creating
        const createPayload = Object.fromEntries(
          Object.entries(profileData).filter(([_, value]) => value !== undefined)
        )
        await savePreorderProfile(createPayload)
        setError(null)
      } else if (profileFormMode === 'edit' && selectedProfileForForm?.id) {
        // Include id in update payload (required for proper updates)
        const updatePayload = { ...profileData, id: selectedProfileForForm.id }
        // Filter out undefined values
        Object.keys(updatePayload).forEach(key => {
          if (updatePayload[key] === undefined) {
            delete updatePayload[key]
          }
        })
        await savePreorderProfile(updatePayload)
        setError(null)
      }
      handleCloseProfileForm()
      
      // Refresh the profiles list
      const updatedProfiles = await fetchPreorderProfiles()
      setProfiles(updatedProfiles || [])
    } catch (error) {
      debugWarn('Error saving preorder profile:', error)
      setError('Failed to save profile')
    }
  }

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <DataHeader
          showDateControls={false}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search preorder profiles..."
          filters={[]}
          filtersExpanded={false}
          onFiltersToggle={() => {}}
          sortOptions={sortOptions}
          sortValue={sortBy}
          sortDirection={sortDirection}
          onSortChange={(value, direction) => {
            setSortBy(value)
            setSortDirection(direction)
          }}
          onCreateNew={() => handleOpenProfileForm(null, 'create')}
          createButtonLabel="Create Profile"
          createDisabled={!canMutate}
          createDisabledTooltip="You don't have permission to create or edit preorder profiles."
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* No loading indicators — UI renders and fills as data arrives (like HR section) */}
      {filteredAndSortedProfiles.length === 0 ? (
        <Box sx={{ py: 4 }}>
          <EmptyStateCard
            icon={BookmarkIcon}
            title={searchTerm.trim() ? "No preorder profiles match your filters" : "No preorder profiles found"}
            description={
              searchTerm.trim()
                ? "Try adjusting your search query."
                : "Create your first preorder profile to get started."
            }
          />
        </Box>
      ) : (
        <Grid container spacing={1}>
          {filteredAndSortedProfiles.map((p) => (
            <Grid item xs={12} sm={6} md={3} lg={2} xl={1.5} key={p.id}>
              <Card 
                sx={{ 
                  minHeight: 90, 
                  position: 'relative',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: 2,
                  },
                }}
                onClick={() => handleOpenProfileForm(p, 'view')}
              >
                <CardContent sx={{ flexGrow: 1, p: 0.75, pr: 4.5, '&:last-child': { pb: 0.75 } }}>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <RestaurantIcon color="primary" sx={{ mr: 0.5, fontSize: 14 }} />
                    <Typography variant="subtitle2" component="h3" sx={{ fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.1, wordBreak: 'break-word' }}>
                      {p.name}
                    </Typography>
                  </Box>
                </CardContent>

                {/* Action Icons positioned on the right */}
                <Box sx={{ 
                  position: "absolute", 
                  top: 6, 
                  right: 6, 
                  display: "flex", 
                  flexDirection: "column", 
                  gap: 0.02 
                }}>
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenProfileForm(p, 'edit')
                      }}
                      disabled={!canMutate}
                      sx={{ 
                        width: 28, 
                        height: 28, 
                        fontSize: '0.8rem',
                        '&:hover': { backgroundColor: 'primary.light', color: 'white' }
                      }}
                    >
                      <EditIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(p.id)
                      }}
                      disabled={!canRemove}
                      sx={{ 
                        width: 28, 
                        height: 28, 
                        fontSize: '0.8rem',
                        '&:hover': { backgroundColor: 'error.light', color: 'white' }
                      }}
                    >
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}


      {/* CRUD Modal */}
            <CRUDModal
        open={profileFormOpen}
        onClose={(reason) => {
          setProfileFormOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            const __workspaceOnClose = handleCloseProfileForm
            if (typeof __workspaceOnClose === "function") {
              __workspaceOnClose(reason)
            }
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "preorderProfilesModal1",
          crudMode: profileFormMode,
          id: selectedProfileForForm?.id,
          itemLabel: selectedProfileForForm?.name,
        }}
      >
        <PreorderProfileForm
          profile={selectedProfileForForm}
          mode={profileFormMode}
          onSave={handleSaveProfile}
        />
      </CRUDModal>
    </Box>
  )
}

export default PreorderProfiles


