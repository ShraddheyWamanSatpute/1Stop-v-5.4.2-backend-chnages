"use client"
import { useLocation } from "react-router-dom"

import type React from "react"
import { useState, useCallback, useMemo, useEffect } from "react"
import { useSettings } from "../../../backend/context/SettingsContext"
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Paper,
  Snackbar,
  TextField,
  Typography,
  Alert,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  List,
  ListItem,
  ListItemButton,
  Checkbox,
  Collapse,
} from "@mui/material"
import {
  Add as AddIcon,
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Business as BusinessIcon,
  Store as StoreIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ContentCopy as ContentCopyIcon,
} from "@mui/icons-material"
import DataHeader from "../../components/reusable/DataHeader"
import EmptyStateCard from "../../components/reusable/EmptyStateCard"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../components/reusable/CRUDModal"
import { useCompany } from "../../../backend/context/CompanyContext"
import RequireCompanyContext from "../../components/global/RequireCompanyContext"
import { registerWithEmailAndPassword } from "../../../backend/data/Settings"
import { addUserToCompanyInDb, setCompanyUserInDb } from "../../../backend/data/Company"
import { db, ref, set } from "../../../backend/services/Firebase"

// Define form state interfaces
interface NewSiteForm {
  name: string
  description: string
  address: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
}

interface NewSubsiteForm {
  name: string
  description: string
  location: string
  address: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
}

interface EditSiteForm {
  siteID: string
  name: string
  description: string
  address: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
}

interface EditSubsiteForm extends NewSubsiteForm {
  subsiteID: string
}

const SiteManagement: React.FC = () => {
  const location = useLocation()
  const {
    state,
    createSite,
    createSubsite,
    updateSite,
    updateSubsite,
    deleteSite,
    deleteSubsite,
    updateSiteDataManagement,
    updateSubsiteDataManagement,
    selectSite,
    refreshSites
  } = useCompany()

  const { state: settingsState } = useSettings()
  const currentUser = settingsState.user

  // UI state
  const [loading, setLoading] = useState<boolean>(false)
  const [siteDialogOpen, setSiteDialogOpen] = useState<boolean>(false)
  const [subsiteDialogOpen, setSubsiteDialogOpen] = useState<boolean>(false)
  const [editSiteDialogOpen, setEditSiteDialogOpen] = useState<boolean>(false)
  const [editSubsiteDialogOpen, setEditSubsiteDialogOpen] = useState<boolean>(false)
  const [dataManagementDialogOpen, setDataManagementDialogOpen] = useState<boolean>(false)
  const [selectedSiteID, setSelectedSiteID] = useState<string | null>(null)
  const [selectedSubsiteID, setSelectedSubsiteID] = useState<string | null>(null)
  const [snackbarState, setSnackbarState] = useState<{
    open: boolean
    message: string
    severity: "success" | "error"
  }>({
    open: false,
    message: "",
    severity: "success",
  })

  // Form states
  const [newSite, setNewSite] = useState<NewSiteForm>({
    name: "",
    description: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
  })

  const [newSubsite, setNewSubsite] = useState<NewSubsiteForm>({
    name: "",
    description: "",
    location: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
  })

  const [editSite, setEditSite] = useState<EditSiteForm>({
    siteID: "",
    name: "",
    description: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
  })

  const [editSubsite, setEditSubsite] = useState<EditSubsiteForm>({
    subsiteID: "",
    name: "",
    description: "",
    location: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
  })

  const [siteDataConfig, setSiteDataConfig] = useState<{
    accessibleModules: { [key: string]: "company" | "site" | "subsite" };
    accessibleSites: string[];
    accessibleSubsites: string[];
  }>({
    accessibleModules: {},
    accessibleSites: [],
    accessibleSubsites: []
  })

  // Helpers to compute current saved config and detect changes
  const currentSavedConfig = useMemo(() => {
    if (!selectedSiteID) return { accessibleSites: [], accessibleSubsites: [] }
    const site = state.sites?.find(s => s.siteID === selectedSiteID)
    if (selectedSubsiteID) {
      const subsite = site?.subsites && (site.subsites as any)[selectedSubsiteID]
      return {
        accessibleSites: subsite?.dataManagement?.accessibleSites || [],
        accessibleSubsites: subsite?.dataManagement?.accessibleSubsites || []
      }
    }
    return {
      accessibleSites: site?.dataManagement?.accessibleSites || [],
      accessibleSubsites: site?.dataManagement?.accessibleSubsites || []
    }
  }, [state.sites, selectedSiteID, selectedSubsiteID])

  const arraysEqualIgnoreOrder = (a: string[], b: string[]) => {
    if (a.length !== b.length) return false
    const sa = [...a].sort()
    const sb = [...b].sort()
    return sa.every((v, i) => v === sb[i])
  }

  const isDataConfigDirty = useMemo(() => {
    return !arraysEqualIgnoreOrder(siteDataConfig.accessibleSites, currentSavedConfig.accessibleSites) ||
           !arraysEqualIgnoreOrder(siteDataConfig.accessibleSubsites, currentSavedConfig.accessibleSubsites)
  }, [siteDataConfig, currentSavedConfig])

  // Dialog close handler with unsaved-changes guard
  const handleCloseDataManagementDialog = useCallback(() => {
    if (isDataConfigDirty) {
      const confirmClose = window.confirm("Discard unsaved data access changes?")
      if (!confirmClose) return
    }
    setDataManagementDialogOpen(false)
  }, [isDataConfigDirty])

  const [createAccountDialogOpen, setCreateAccountDialogOpen] = useState<boolean>(false)
  const [accountForm, setAccountForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    siteId: "",
    subsiteId: "",
  })
  const isEmailValid = useMemo(() => {
    if (!accountForm.email) return false
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(accountForm.email)
  }, [accountForm.email])
  const isPasswordValid = useMemo(() => {
    return accountForm.password.length >= 6
  }, [accountForm.password])
  const doPasswordsMatch = useMemo(() => {
    return accountForm.password === accountForm.confirmPassword && accountForm.password.length > 0
  }, [accountForm.password, accountForm.confirmPassword])
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set())
  const [deleteSiteConfirmOpen, setDeleteSiteConfirmOpen] = useState(false)
  const [pendingDeleteSiteID, setPendingDeleteSiteID] = useState<string | null>(null)
  const [isDeletingSite, setIsDeletingSite] = useState(false)
  const [deleteSubsiteConfirmOpen, setDeleteSubsiteConfirmOpen] = useState(false)
  const [pendingDeleteSubsite, setPendingDeleteSubsite] = useState<{ siteId: string; subsiteId: string } | null>(null)
  const [isDeletingSubsite, setIsDeletingSubsite] = useState(false)

  // Search / filter / sort UI state
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [filtersExpanded, setFiltersExpanded] = useState<boolean>(false)
  const [siteTypeFilter, setSiteTypeFilter] = useState<string[]>([])
  const [subsiteFilter, setSubsiteFilter] = useState<string[]>([])
  const [addressFilter, setAddressFilter] = useState<string[]>([])
  const [sortValue, setSortValue] = useState<string>("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Toggle site expansion
  const toggleSiteExpansion = useCallback((siteId: string) => {
    setExpandedSites((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(siteId)) {
        newSet.delete(siteId)
      } else {
        newSet.add(siteId)
      }
      return newSet
    })
  }, [])

  // Snackbar close handler
  const handleCloseSnackbar = useCallback(() => {
    setSnackbarState((prev) => ({ ...prev, open: false }))
  }, [])

  // Handler functions for site and subsite operations
  const handleDeleteSite = useCallback((siteId: string) => {
    setPendingDeleteSiteID(siteId)
    setDeleteSiteConfirmOpen(true)
  }, [])

  const handleConfirmDeleteSite = useCallback(async () => {
    if (!pendingDeleteSiteID) return

    try {
      setIsDeletingSite(true)
      await deleteSite(pendingDeleteSiteID)
      setSnackbarState({
        open: true,
        message: "Site deleted successfully",
        severity: "success",
      })
    } catch (error) {
      console.error("Error deleting site:", error)
      setSnackbarState({
        open: true,
        message: "Failed to delete site",
        severity: "error",
      })
    } finally {
      setIsDeletingSite(false)
      setDeleteSiteConfirmOpen(false)
      setPendingDeleteSiteID(null)
    }
  }, [deleteSite, pendingDeleteSiteID])

  const handleDeleteSubsite = useCallback((siteId: string, subsiteId: string) => {
    setPendingDeleteSubsite({ siteId, subsiteId })
    setDeleteSubsiteConfirmOpen(true)
  }, [])

  const handleConfirmDeleteSubsite = useCallback(async () => {
    if (!pendingDeleteSubsite) return

    try {
      setIsDeletingSubsite(true)
      await deleteSubsite(pendingDeleteSubsite.siteId, pendingDeleteSubsite.subsiteId)
      setSnackbarState({
        open: true,
        message: "Subsite deleted successfully",
        severity: "success",
      })
    } catch (error) {
      console.error("Error deleting subsite:", error)
      setSnackbarState({
        open: true,
        message: "Failed to delete subsite",
        severity: "error",
      })
    } finally {
      setIsDeletingSubsite(false)
      setDeleteSubsiteConfirmOpen(false)
      setPendingDeleteSubsite(null)
    }
  }, [deleteSubsite, pendingDeleteSubsite])

  // Handler functions for dialog operations
  const validateSiteForm = (site: NewSiteForm | EditSiteForm) => {
    const errors: { [key: string]: string } = {};
    if (!site.name.trim()) {
      errors.name = "Site name is required";
    }
    return errors;
  };

  // Reset form state
  const resetNewSiteForm = useCallback(() => {
    setNewSite({
      name: "",
      description: "",
      address: {
        street: "",
        city: "",
        state: "",
        zipCode: "",
        country: "",
      },
    })
  }, [])

  const handleCreateSite = useCallback(async () => {
    // Validate form before proceeding
    const errors = validateSiteForm(newSite);
    if (Object.keys(errors).length > 0) {
      setSnackbarState({
        open: true,
        message: Object.values(errors)[0],
        severity: "error"
      });
      return;
    }

    // Double-check that name is not empty (prevent empty sites)
    if (!newSite.name.trim()) {
      setSnackbarState({
        open: true,
        message: "Site name is required",
        severity: "error"
      });
      return;
    }

    try {
      await createSite({
        name: newSite.name.trim(),
        description: newSite.description.trim(),
        address: newSite.address,
        subsites: {},
        teams: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      setSiteDialogOpen(false)
      resetNewSiteForm()
      setSnackbarState({
        open: true,
        message: "Site created successfully",
        severity: "success",
      })
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "siteManagementModal1",
        crudMode: "create",
      })
    } catch (error) {
      console.error("Error creating site:", error)
      setSnackbarState({
        open: true,
        message: "Failed to create site",
        severity: "error",
      })
    }
  }, [createSite, newSite, resetNewSiteForm, location.pathname])

  // Handle site dialog close with form reset
  const handleSiteDialogClose = useCallback(() => {
    setSiteDialogOpen(false)
    resetNewSiteForm()
  }, [resetNewSiteForm])

  const validateSubsiteForm = (subsite: NewSubsiteForm | EditSubsiteForm) => {
    const errors: { [key: string]: string } = {};
    if (!subsite.name.trim()) {
      errors.name = "Subsite name is required";
    }
    return errors;
  };

  // Reset subsite form state
  const resetNewSubsiteForm = useCallback(() => {
    setNewSubsite({
      name: "",
      description: "",
      location: "",
      address: {
        street: "",
        city: "",
        state: "",
        zipCode: "",
        country: "",
      },
    })
  }, [])

  const handleCreateSubsite = useCallback(async () => {
    if (!selectedSiteID) return;

    const errors = validateSubsiteForm(newSubsite);
    if (Object.keys(errors).length > 0) {
      setSnackbarState({
        open: true,
        message: Object.values(errors)[0],
        severity: "error"
      });
      return;
    }

    // Double-check that name is not empty
    if (!newSubsite.name.trim()) {
      setSnackbarState({
        open: true,
        message: "Subsite name is required",
        severity: "error"
      });
      return;
    }

    try {
      const selectedSite = state.sites?.find((site) => site.siteID === selectedSiteID)
      if (selectedSite) {
        selectSite(selectedSiteID, selectedSite.name)
      }

      await createSubsite({
        name: newSubsite.name.trim(),
        description: newSubsite.description.trim(),
        location: newSubsite.location?.trim() || "",
        address: newSubsite.address,
        teams: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      setSubsiteDialogOpen(false)
      resetNewSubsiteForm()
      setSnackbarState({
        open: true,
        message: "Subsite created successfully",
        severity: "success",
      })
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "siteManagementModal2",
        crudMode: "create",
      })
    } catch (error) {
      console.error("Error creating subsite:", error)
      setSnackbarState({
        open: true,
        message: "Failed to create subsite",
        severity: "error",
      })
    }
  }, [createSubsite, selectedSiteID, newSubsite, selectSite, state.sites, resetNewSubsiteForm, location.pathname])

  // Handle subsite dialog close with form reset
  const handleSubsiteDialogClose = useCallback(() => {
    setSubsiteDialogOpen(false)
    resetNewSubsiteForm()
  }, [resetNewSubsiteForm])

  const handleEditSite = useCallback(async () => {
    if (!selectedSiteID) return;

    const errors = validateSiteForm(editSite);
    if (Object.keys(errors).length > 0) {
      setSnackbarState({
        open: true,
        message: Object.values(errors)[0],
        severity: "error"
      });
      return;
    }

    try {
      const updateData = {
        name: editSite.name,
        description: editSite.description,
        address: editSite.address,
      }

      await updateSite(selectedSiteID, updateData)
      setEditSiteDialogOpen(false)
      setSnackbarState({
        open: true,
        message: "Site updated successfully",
        severity: "success",
      })
    } catch (error) {
      console.error("Error updating site:", error)
      setSnackbarState({
        open: true,
        message: "Failed to update site",
        severity: "error",
      })
    }
  }, [updateSite, selectedSiteID, editSite])

  const handleEditSubsite = useCallback(async () => {
    if (!selectedSiteID || !selectedSubsiteID) return;

    const errors = validateSubsiteForm(editSubsite);
    if (Object.keys(errors).length > 0) {
      setSnackbarState({
        open: true,
        message: Object.values(errors)[0],
        severity: "error"
      });
      return;
    }

    try {
      const updateData = {
        name: editSubsite.name,
        description: editSubsite.description,
        location: editSubsite.location,
        address: editSubsite.address,
      }

      await updateSubsite(selectedSiteID, selectedSubsiteID, updateData)
      setEditSubsiteDialogOpen(false)
      setSnackbarState({
        open: true,
        message: "Subsite updated successfully",
        severity: "success",
      })
    } catch (error) {
      console.error("Error updating subsite:", error)
      setSnackbarState({
        open: true,
        message: "Failed to update subsite",
        severity: "error",
      })
    }
  }, [updateSubsite, selectedSiteID, selectedSubsiteID, editSubsite])

  const handleUpdateDataManagement = useCallback(async () => {
    if (!selectedSiteID) {
      setSnackbarState({
        open: true,
        message: "No site selected",
        severity: "error",
      });
      return;
    }

    try {
      // If no sites/subsites are selected, default to current path
      const config = {
        accessibleModules: siteDataConfig.accessibleModules || {},
        accessibleSites: siteDataConfig.accessibleSites.length > 0 
          ? [...siteDataConfig.accessibleSites]
          : [selectedSiteID],
        accessibleSubsites: siteDataConfig.accessibleSubsites.length > 0
          ? [...siteDataConfig.accessibleSubsites]
          : selectedSubsiteID ? [selectedSubsiteID] : []
      };

      console.log('Saving config:', config);

      if (selectedSubsiteID) {
        console.log('Updating subsite data management:', selectedSiteID, selectedSubsiteID, config);
        await updateSubsiteDataManagement(selectedSiteID, selectedSubsiteID, config);
      } else {
        console.log('Updating site data management:', selectedSiteID, config);
        await updateSiteDataManagement(selectedSiteID, config);
      }

      // Update the global site/subsite data context
      console.log('Refreshing sites data');
      await refreshSites();
      // Data source configuration updated - sites will use the new configuration automatically
      
      setDataManagementDialogOpen(false);
      setSnackbarState({
        open: true,
        message: "Data access configuration updated successfully",
        severity: "success",
      });
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "siteManagementModal3",
        crudMode: "edit",
      });
    } catch (error) {
      console.error("Error updating data access configuration:", error);
      setSnackbarState({
        open: true,
        message: error instanceof Error ? error.message : "Failed to update data access configuration",
        severity: "error",
      });
    }
  }, [
    updateSiteDataManagement,
    updateSubsiteDataManagement,
    selectedSiteID,
    selectedSubsiteID,
    siteDataConfig,
    refreshSites,
    setSnackbarState,
    setDataManagementDialogOpen,
    location.pathname,
  ])

  // Handle creating site account
  const handleCreateSiteAccount = useCallback(async () => {
    if (!state.companyID || !accountForm.email || !accountForm.password || !accountForm.siteId) {
      setSnackbarState({
        open: true,
        message: "Please fill in all required fields",
        severity: "error",
      })
      return
    }

    if (!isEmailValid) {
      setSnackbarState({
        open: true,
        message: "Please enter a valid email address",
        severity: "error",
      })
      return
    }

    if (!isPasswordValid) {
      setSnackbarState({
        open: true,
        message: "Password must be at least 6 characters",
        severity: "error",
      })
      return
    }

    if (!doPasswordsMatch) {
      setSnackbarState({
        open: true,
        message: "Passwords do not match",
        severity: "error",
      })
      return
    }

    try {
      setLoading(true)
      
      // Step 1: Create Firebase Auth account
      const { uid } = await registerWithEmailAndPassword(
        accountForm.email,
        accountForm.password,
        `Site Account - ${state.sites?.find((s) => s.siteID === accountForm.siteId)?.name || ""}`
      )

      // Step 2: Add user to company users
      const siteName = state.sites?.find((s) => s.siteID === accountForm.siteId)?.name || ""
      const subsiteName = accountForm.subsiteId 
        ? Object.values(state.sites?.find((s) => s.siteID === accountForm.siteId)?.subsites || {}).find(
            (sub: any) => sub.subsiteID === accountForm.subsiteId
          )?.name || ""
        : ""

      const companyData = {
        companyID: state.companyID,
        companyName: state.companyName || "",
        role: "site",
        department: "Site Operations",
        accessLevel: accountForm.subsiteId ? "subsite" : "site",
        siteId: accountForm.siteId,
        siteName: siteName,
        subsiteId: accountForm.subsiteId || undefined,
        subsiteName: subsiteName || undefined,
        assignedSites: [accountForm.siteId],
        joinedAt: Date.now(),
        isDefault: false,
      }

      // Add to user's companies list
      await addUserToCompanyInDb(uid, state.companyID, companyData)

      // Add to company's users list
      await setCompanyUserInDb(state.companyID, uid, {
        email: accountForm.email,
        displayName: `Site Account - ${siteName}`,
        role: "site",
        department: "Site Operations",
        joinedAt: Date.now(),
      })

      // Step 3: Create user profile in database
      await set(ref(db, `users/${uid}`), {
        uid,
        email: accountForm.email,
        displayName: `Site Account - ${siteName}`,
        role: "site",
        department: "Site Operations",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })

      setSnackbarState({
        open: true,
        message: `Site account created successfully for ${accountForm.email}`,
        severity: "success",
      })
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "siteManagementModal4",
        crudMode: "create",
      })

      // Reset form
      setAccountForm({
        email: "",
        password: "",
        confirmPassword: "",
        siteId: "",
        subsiteId: "",
      })
      setCreateAccountDialogOpen(false)
    } catch (error: any) {
      console.error("Error creating site account:", error)
      let errorMessage = "Failed to create site account"
      if (error.message?.includes("email-already-in-use")) {
        errorMessage = "An account with this email already exists"
      } else if (error.message) {
        errorMessage = error.message
      }
      setSnackbarState({
        open: true,
        message: errorMessage,
        severity: "error",
      })
    } finally {
      setLoading(false)
    }
  }, [state.companyID, accountForm, currentUser, state.companyName, state.sites, isEmailValid, isPasswordValid, doPasswordsMatch, location.pathname])

  // Helper functions for data conversion

  const getAddressDisplay = useCallback((address?: any) => {
    if (!address) return "No address"
    const parts = [address.street, address.city, address.state, address.zipCode, address.country]
      .map((v: any) => (typeof v === "string" ? v.trim() : ""))
      .filter(Boolean)
    return parts.length ? parts.join(", ") : "No address"
  }, [])

  const hasAnyAddress = useCallback((address?: any) => {
    if (!address) return false
    return Object.values(address).some((v: any) => typeof v === "string" && v.trim())
  }, [])

  const filteredAndSortedSites = useMemo(() => {
    const sites = state.sites || []
    const q = searchTerm.trim().toLowerCase()

    const matchesQuery = (site: any) => {
      if (!q) return true
      const siteSubsites = site.subsites && typeof site.subsites === "object" ? Object.values(site.subsites) : []
      const haystack = [
        site.name,
        site.description,
        getAddressDisplay(site.address),
        ...siteSubsites.flatMap((s: any) => [s?.name, s?.description, getAddressDisplay(s?.address), s?.location]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    }

    const matchesFilters = (site: any) => {
      const isMain = Boolean(site.isMainSite)
      const siteSubsites = site.subsites && typeof site.subsites === "object" ? Object.values(site.subsites) : []
      const subsiteCount = siteSubsites.length

      if (siteTypeFilter.length > 0) {
        // Only supported filter is "Main site"
        if (siteTypeFilter.includes("Main site") && !isMain) return false
      }

      if (subsiteFilter.length > 0) {
        const ok =
          (subsiteFilter.includes("Has subsites") && subsiteCount > 0) ||
          (subsiteFilter.includes("No subsites") && subsiteCount === 0)
        if (!ok) return false
      }

      if (addressFilter.length > 0) {
        const hasAddr = hasAnyAddress(site.address)
        const ok =
          (addressFilter.includes("Has address") && hasAddr) ||
          (addressFilter.includes("Missing address") && !hasAddr)
        if (!ok) return false
      }

      return true
    }

    const filtered = sites.filter((s: any) => matchesQuery(s) && matchesFilters(s))

    const dir = sortDirection === "asc" ? 1 : -1
    const sorted = [...filtered].sort((a: any, b: any) => {
      const aSubsites = a.subsites && typeof a.subsites === "object" ? Object.values(a.subsites).length : 0
      const bSubsites = b.subsites && typeof b.subsites === "object" ? Object.values(b.subsites).length : 0

      switch (sortValue) {
        case "subsites":
          return (aSubsites - bSubsites) * dir
        case "updated":
          return ((a.updatedAt || 0) - (b.updatedAt || 0)) * dir
        case "created":
          return ((a.createdAt || 0) - (b.createdAt || 0)) * dir
        case "name":
        default:
          return String(a.name || "").localeCompare(String(b.name || "")) * dir
      }
    })

    return sorted
  }, [
    state.sites,
    searchTerm,
    siteTypeFilter,
    subsiteFilter,
    addressFilter,
    sortValue,
    sortDirection,
    getAddressDisplay,
    hasAnyAddress,
  ])

  const renderSites = useMemo(() => {
    if (!state.sites || state.sites.length === 0) {
      return (
        <Box sx={{ px: 2 }}>
          <EmptyStateCard
            icon={BusinessIcon}
            title="No sites found"
            description="Create your first site to get started."
          />
        </Box>
      )
    }

    if (filteredAndSortedSites.length === 0) {
      return (
        <Box sx={{ px: 2 }}>
          <EmptyStateCard
            icon={BusinessIcon}
            title="No results"
            description="Try adjusting your search, filters, or sort options."
          />
        </Box>
      )
    }

    return (
      <Box>
        {/* Column header row */}
        <Paper
          variant="outlined"
          sx={{
            mb: 1,
            px: 1.5,
            py: 1,
            bgcolor: "grey.50",
            display: { xs: "none", md: "block" },
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "40px 2fr 3fr 3fr 110px 210px",
              gap: 1,
              alignItems: "center",
            }}
          >
            <Box />
            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
              Name
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
              Description
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
              Address
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
              Subsites
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textAlign: "center" }}>
              Actions
            </Typography>
          </Box>
        </Paper>

        <List sx={{ p: 0 }}>
          {filteredAndSortedSites.map((site: any) => {
            const siteSubsites = site.subsites && typeof site.subsites === "object" ? Object.values(site.subsites) : []
            const q = searchTerm.trim().toLowerCase()
            const filteredSubsites =
              q.length === 0
                ? siteSubsites
                : siteSubsites.filter((s: any) => {
                    const hay = [s?.name, s?.description, s?.location, getAddressDisplay(s?.address)]
                      .filter(Boolean)
                      .join(" ")
                      .toLowerCase()
                    return hay.includes(q)
                  })

            return (
              <Box key={site.siteID} sx={{ mb: 1 }}>
                <Paper variant="outlined" sx={{ overflow: "hidden" }}>
                  {/* Site list item (expandable) */}
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => toggleSiteExpansion(site.siteID)}
                      sx={{
                        px: 1.5,
                        py: 1,
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "40px 1fr",
                          md: "40px 2fr 3fr 3fr 110px 210px",
                        },
                        gap: 1,
                        alignItems: "center",
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleSiteExpansion(site.siteID)
                        }}
                        sx={{ p: 0.5 }}
                      >
                        {expandedSites.has(site.siteID) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>

                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                        <BusinessIcon color="primary" fontSize="small" />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
                            {site.name}
                          </Typography>
                          {site.isMainSite && (
                            <Typography variant="caption" color="text.secondary" noWrap>
                              Main site
                            </Typography>
                          )}
                        </Box>
                      </Box>

                      {/* Description */}
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          display: { xs: "none", md: "block" },
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {site.description || "—"}
                      </Typography>

                      {/* Address */}
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          display: { xs: "none", md: "block" },
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {getAddressDisplay(site.address)}
                      </Typography>

                      {/* Subsite count */}
                      <Typography variant="body2" color="text.secondary" sx={{ display: { xs: "none", md: "block" } }}>
                        {siteSubsites.length}
                      </Typography>

                      {/* Actions (stopPropagation so row doesn't toggle) */}
                      <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }} onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="Add Subsite">
                          <IconButton
                            onClick={() => {
                              setSelectedSiteID(site.siteID)
                              setSubsiteDialogOpen(true)
                            }}
                            color="primary"
                            size="small"
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Configure Data Management">
                          <IconButton
                            onClick={() => {
                              setSelectedSiteID(site.siteID)
                              setSiteDataConfig(
                                site.dataManagement || {
                                  accessibleModules: {},
                                  accessibleSites: [],
                                  accessibleSubsites: [],
                                },
                              )
                              setDataManagementDialogOpen(true)
                            }}
                            color="primary"
                            size="small"
                          >
                            <SettingsIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Site">
                          <IconButton
                            onClick={() => {
                              setSelectedSiteID(site.siteID)
                              setEditSite({
                                siteID: site.siteID,
                                name: site.name || "",
                                description: site.description || "",
                                address: site.address || {
                                  street: "",
                                  city: "",
                                  state: "",
                                  zipCode: "",
                                  country: "",
                                },
                              })
                              setEditSiteDialogOpen(true)
                            }}
                            color="primary"
                            size="small"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Site">
                          <IconButton
                            onClick={(e) => {
                              // Prevent focus staying on trigger while Dialog opens (avoids aria-hidden warning)
                              ;(e.currentTarget as HTMLButtonElement).blur()
                              handleDeleteSite(site.siteID)
                            }}
                            color="error"
                            size="small"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </ListItemButton>
                  </ListItem>

                  <Divider />

                  {/* Expandable details (dropdown content) */}
                  <Collapse in={expandedSites.has(site.siteID)} timeout="auto" unmountOnExit>
                    <Box
                      sx={{
                        pl: { xs: 1, md: 3 },
                        pr: 1.5,
                        py: 0.5,
                        borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                        bgcolor: "action.hover",
                      }}
                    >
                      {filteredSubsites && filteredSubsites.length > 0 ? (
                        filteredSubsites.map((subsite: any, subIdx: number) => (
                          <Box
                            key={subsite.subsiteID}
                            sx={{
                              px: 1.5,
                              py: 1,
                              display: "grid",
                              gridTemplateColumns: {
                                xs: "40px 1fr",
                                md: "40px 2fr 3fr 3fr 110px 210px",
                              },
                              gap: 1,
                              alignItems: "center",
                              borderBottom:
                                subIdx < filteredSubsites.length - 1
                                  ? (theme) => `1px solid ${theme.palette.divider}`
                                  : "none",
                            }}
                          >
                            <Box sx={{ display: "flex", justifyContent: "center" }}>
                              <StoreIcon fontSize="small" color="action" />
                            </Box>

                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }} noWrap>
                              {subsite.name}
                            </Typography>

                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                display: { xs: "none", md: "block" },
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {subsite.description || "—"}
                            </Typography>

                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                display: { xs: "none", md: "block" },
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {getAddressDisplay(subsite.address)}
                            </Typography>

                            {/* Align with site row “Subsites” column; no value for subsite rows */}
                            <Box sx={{ display: { xs: "none", md: "block" } }} />

                            <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
                              <Tooltip title="Configure Data Management">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedSiteID(site.siteID)
                                    setSelectedSubsiteID(subsite.subsiteID)
                                    setSiteDataConfig(
                                      subsite.dataManagement || {
                                        accessibleModules: {},
                                        accessibleSites: [],
                                        accessibleSubsites: [],
                                      },
                                    )
                                    setDataManagementDialogOpen(true)
                                  }}
                                  color="primary"
                                >
                                  <SettingsIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Edit Subsite">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedSiteID(site.siteID)
                                    setSelectedSubsiteID(subsite.subsiteID)
                                    setEditSubsite({
                                      subsiteID: subsite.subsiteID,
                                      name: subsite.name || "",
                                      description: subsite.description || "",
                                      location: subsite.location || "",
                                      address: subsite.address || {
                                        street: "",
                                        city: "",
                                        state: "",
                                        zipCode: "",
                                        country: "",
                                      },
                                    })
                                    setEditSubsiteDialogOpen(true)
                                  }}
                                  color="primary"
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Subsite">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    ;(e.currentTarget as HTMLButtonElement).blur()
                                    handleDeleteSubsite(site.siteID, subsite.subsiteID)
                                  }}
                                  color="error"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>
                        ))
                      ) : (
                        <Box sx={{ py: 2, px: 1 }}>
                          <Typography variant="body2" color="text.secondary" align="center">
                            {q.length > 0
                              ? "No subsites match your search."
                              : "No subsites yet. Use Add Subsite on the site row above."}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Collapse>
                </Paper>
              </Box>
            )
          })}
        </List>
      </Box>
    )
  }, [
    state.sites,
    filteredAndSortedSites,
    expandedSites,
    toggleSiteExpansion,
    handleDeleteSite,
    handleDeleteSubsite,
    getAddressDisplay,
    searchTerm,
  ])


  return (
    <RequireCompanyContext>
    <Box sx={{ p: 0 }}>
      <DataHeader
        showDateControls={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search sites and subsites..."
        filters={[
          {
            label: "Main Site",
            options: [
              { id: "main", name: "Main site" },
            ],
            selectedValues: siteTypeFilter,
            onSelectionChange: setSiteTypeFilter,
          },
          {
            label: "Subsites",
            options: [
              { id: "has", name: "Has subsites" },
              { id: "none", name: "No subsites" },
            ],
            selectedValues: subsiteFilter,
            onSelectionChange: setSubsiteFilter,
          },
          {
            label: "Address",
            options: [
              { id: "has", name: "Has address" },
              { id: "missing", name: "Missing address" },
            ],
            selectedValues: addressFilter,
            onSelectionChange: setAddressFilter,
          },
        ]}
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded((p) => !p)}
        sortOptions={[
          { value: "name", label: "Name" },
          { value: "subsites", label: "Subsite count" },
          { value: "updated", label: "Updated" },
          { value: "created", label: "Created" },
        ]}
        sortValue={sortValue}
        sortDirection={sortDirection}
        onSortChange={(value, direction) => {
          setSortValue(value)
          setSortDirection(direction)
        }}
        additionalButtons={[
          {
            label: "Create Site Account",
            icon: <PersonIcon />,
            onClick: () => setCreateAccountDialogOpen(true),
            variant: "outlined" as const,
            color: "secondary" as const
          },
          {
            label: "Add Site",
            icon: <AddIcon />,
            onClick: () => setSiteDialogOpen(true),
            variant: "contained" as const,
            color: "primary" as const
          }
        ]}
      />

      <Card>
        <CardContent>
          {/* Header actions moved to primary toolbar above for consistency */}
          {renderSites}

          {/* Add Site Modal */}
          <CRUDModal
            open={siteDialogOpen}
            onClose={(reason) => {
              setSiteDialogOpen(false)
              if (isCrudModalHardDismiss(reason)) {
                resetNewSiteForm()
              }
            }}
            workspaceFormShortcut={{
              crudEntity: "siteManagementModal1",
              crudMode: "create",
            }}
            title="Add New Site"
            icon={<AddIcon />}
            mode="create"
            onSave={handleCreateSite}
            saveButtonText="Create"
            maxWidth="sm"
            disabled={!newSite.name.trim()}
          >
            <TextField
              autoFocus
              margin="dense"
              label="Site Name"
              fullWidth
              required
              value={newSite.name}
              onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
              error={!newSite.name.trim()}
              helperText={!newSite.name.trim() ? "Site name is required" : ""}
            />
            <TextField
              margin="dense"
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={newSite.description}
              onChange={(e) => setNewSite({ ...newSite, description: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Street"
              fullWidth
              value={newSite.address.street}
              onChange={(e) =>
                setNewSite({
                  ...newSite,
                  address: {
                    ...newSite.address,
                    street: e.target.value,
                  },
                })
              }
            />
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                margin="dense"
                label="City"
                fullWidth
                value={newSite.address.city}
                onChange={(e) =>
                  setNewSite({
                    ...newSite,
                    address: {
                      ...newSite.address,
                      city: e.target.value,
                    },
                  })
                }
              />
              <TextField
                margin="dense"
                label="State/Province"
                fullWidth
                value={newSite.address.state}
                onChange={(e) =>
                  setNewSite({
                    ...newSite,
                    address: {
                      ...newSite.address,
                      state: e.target.value,
                    },
                  })
                }
              />
            </Box>
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                margin="dense"
                label="Postal/Zip Code"
                fullWidth
                value={newSite.address.zipCode}
                onChange={(e) =>
                  setNewSite({
                    ...newSite,
                    address: {
                      ...newSite.address,
                      zipCode: e.target.value,
                    },
                  })
                }
              />
              <TextField
                margin="dense"
                label="Country"
                fullWidth
                value={newSite.address.country}
                onChange={(e) =>
                  setNewSite({
                    ...newSite,
                    address: {
                      ...newSite.address,
                      country: e.target.value,
                    },
                  })
                }
              />
            </Box>
          </CRUDModal>

          {/* Add Subsite Modal */}
          <CRUDModal
            open={subsiteDialogOpen}
            onClose={(reason) => {
              setSubsiteDialogOpen(false)
              if (isCrudModalHardDismiss(reason)) {
                resetNewSubsiteForm()
              }
            }}
            workspaceFormShortcut={{
              crudEntity: "siteManagementModal2",
              crudMode: "create",
            }}
            title="Add New Subsite"
            icon={<StoreIcon />}
            mode="create"
            onSave={handleCreateSubsite}
            saveButtonText="Create"
            maxWidth="sm"
            disabled={!newSubsite.name.trim()}
          >
            <TextField
              autoFocus
              margin="dense"
              label="Subsite Name"
              fullWidth
              required
              value={newSubsite.name}
              onChange={(e) => setNewSubsite({ ...newSubsite, name: e.target.value })}
              error={!newSubsite.name.trim()}
              helperText={!newSubsite.name.trim() ? "Subsite name is required" : ""}
            />
            <TextField
              margin="dense"
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={newSubsite.description}
              onChange={(e) => setNewSubsite({ ...newSubsite, description: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Location"
              fullWidth
              value={newSubsite.location}
              onChange={(e) => setNewSubsite({ ...newSubsite, location: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Street"
              fullWidth
              value={newSubsite.address.street}
              onChange={(e) =>
                setNewSubsite({
                  ...newSubsite,
                  address: {
                    ...newSubsite.address,
                    street: e.target.value,
                  },
                })
              }
            />
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                margin="dense"
                label="City"
                fullWidth
                value={newSubsite.address.city}
                onChange={(e) =>
                  setNewSubsite({
                    ...newSubsite,
                    address: {
                      ...newSubsite.address,
                      city: e.target.value,
                    },
                  })
                }
              />
              <TextField
                margin="dense"
                label="State/Province"
                fullWidth
                value={newSubsite.address.state}
                onChange={(e) =>
                  setNewSubsite({
                    ...newSubsite,
                    address: {
                      ...newSubsite.address,
                      state: e.target.value,
                    },
                  })
                }
              />
            </Box>
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                margin="dense"
                label="Postal/Zip Code"
                fullWidth
                value={newSubsite.address.zipCode}
                onChange={(e) =>
                  setNewSubsite({
                    ...newSubsite,
                    address: {
                      ...newSubsite.address,
                      zipCode: e.target.value,
                    },
                  })
                }
              />
              <TextField
                margin="dense"
                label="Country"
                fullWidth
                value={newSubsite.address.country}
                onChange={(e) =>
                  setNewSubsite({
                    ...newSubsite,
                    address: {
                      ...newSubsite.address,
                      country: e.target.value,
                    },
                  })
                }
              />
            </Box>
          </CRUDModal>

          {/* Delete Site Confirm Dialog */}
          <Dialog
            open={deleteSiteConfirmOpen}
            onClose={() => {
              if (isDeletingSite) return
              setDeleteSiteConfirmOpen(false)
              setPendingDeleteSiteID(null)
            }}
            maxWidth="xs"
            fullWidth
          >
            <DialogTitle>Delete this site?</DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary">
                This will delete the site and all nested data. This cannot be undone.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => {
                  if (isDeletingSite) return
                  setDeleteSiteConfirmOpen(false)
                  setPendingDeleteSiteID(null)
                }}
                disabled={isDeletingSite}
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmDeleteSite} color="error" variant="contained" disabled={isDeletingSite}>
                {isDeletingSite ? "Deleting..." : "Delete"}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Delete Subsite Confirm Dialog */}
          <Dialog
            open={deleteSubsiteConfirmOpen}
            onClose={() => {
              if (isDeletingSubsite) return
              setDeleteSubsiteConfirmOpen(false)
              setPendingDeleteSubsite(null)
            }}
            maxWidth="xs"
            fullWidth
          >
            <DialogTitle>Delete this subsite?</DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary">
                This will delete the subsite and its nested data. This cannot be undone.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => {
                  if (isDeletingSubsite) return
                  setDeleteSubsiteConfirmOpen(false)
                  setPendingDeleteSubsite(null)
                }}
                disabled={isDeletingSubsite}
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmDeleteSubsite} color="error" variant="contained" disabled={isDeletingSubsite}>
                {isDeletingSubsite ? "Deleting..." : "Delete"}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Edit Site Dialog */}
          <Dialog 
            open={editSiteDialogOpen} 
            onClose={() => setEditSiteDialogOpen(false)} 
            maxWidth="sm" 
            fullWidth
            disableEnforceFocus
            keepMounted
            aria-labelledby="edit-site-dialog-title"
          >
            <DialogTitle id="edit-site-dialog-title">Edit Site</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label="Site Name"
                fullWidth
                value={editSite.name}
                onChange={(e) => setEditSite({ ...editSite, name: e.target.value })}
              />
              <TextField
                margin="dense"
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={editSite.description}
                onChange={(e) => setEditSite({ ...editSite, description: e.target.value })}
              />
              <TextField
                margin="dense"
                label="Street"
                fullWidth
                value={editSite.address.street}
                onChange={(e) =>
                  setEditSite({
                    ...editSite,
                    address: {
                      ...editSite.address,
                      street: e.target.value,
                    },
                  })
                }
              />
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  margin="dense"
                  label="City"
                  fullWidth
                  value={editSite.address.city}
                  onChange={(e) =>
                    setEditSite({
                      ...editSite,
                      address: {
                        ...editSite.address,
                        city: e.target.value,
                      },
                    })
                  }
                />
                <TextField
                  margin="dense"
                  label="State/Province"
                  fullWidth
                  value={editSite.address.state}
                  onChange={(e) =>
                    setEditSite({
                      ...editSite,
                      address: {
                        ...editSite.address,
                        state: e.target.value,
                      },
                    })
                  }
                />
              </Box>
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  margin="dense"
                  label="Postal/Zip Code"
                  fullWidth
                  value={editSite.address.zipCode}
                  onChange={(e) =>
                    setEditSite({
                      ...editSite,
                      address: {
                        ...editSite.address,
                        zipCode: e.target.value,
                      },
                    })
                  }
                />
                <TextField
                  margin="dense"
                  label="Country"
                  fullWidth
                  value={editSite.address.country}
                  onChange={(e) =>
                    setEditSite({
                      ...editSite,
                      address: {
                        ...editSite.address,
                        country: e.target.value,
                      },
                    })
                  }
                />
              </Box>

            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEditSiteDialogOpen(false)} color="primary">
                Cancel
              </Button>
              <Button onClick={handleEditSite} color="primary" disabled={!editSite.name}>
                Save Changes
              </Button>
            </DialogActions>
          </Dialog>

          {/* Edit Subsite Dialog */}
          <Dialog 
            open={editSubsiteDialogOpen} 
            onClose={() => setEditSubsiteDialogOpen(false)} 
            maxWidth="sm" 
            fullWidth
            disableEnforceFocus
            keepMounted
            aria-labelledby="edit-subsite-dialog-title"
          >
            <DialogTitle id="edit-subsite-dialog-title">Edit Subsite</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label="Subsite Name"
                fullWidth
                value={editSubsite.name}
                onChange={(e) => setEditSubsite({ ...editSubsite, name: e.target.value })}
              />
              <TextField
                margin="dense"
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={editSubsite.description}
                onChange={(e) => setEditSubsite({ ...editSubsite, description: e.target.value })}
              />
              <TextField
                margin="dense"
                label="Location"
                fullWidth
                value={editSubsite.location}
                onChange={(e) => setEditSubsite({ ...editSubsite, location: e.target.value })}
              />
              <TextField
                margin="dense"
                label="Street"
                fullWidth
                value={editSubsite.address.street}
                onChange={(e) =>
                  setEditSubsite({
                    ...editSubsite,
                    address: {
                      ...editSubsite.address,
                      street: e.target.value,
                    },
                  })
                }
              />
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  margin="dense"
                  label="City"
                  fullWidth
                  value={editSubsite.address.city}
                  onChange={(e) =>
                    setEditSubsite({
                      ...editSubsite,
                      address: {
                        ...editSubsite.address,
                        city: e.target.value,
                      },
                    })
                  }
                />
                <TextField
                  margin="dense"
                  label="State/Province"
                  fullWidth
                  value={editSubsite.address.state}
                  onChange={(e) =>
                    setEditSubsite({
                      ...editSubsite,
                      address: {
                        ...editSubsite.address,
                        state: e.target.value,
                      },
                    })
                  }
                />
              </Box>
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  margin="dense"
                  label="Postal/Zip Code"
                  fullWidth
                  value={editSubsite.address.zipCode}
                  onChange={(e) =>
                    setEditSubsite({
                      ...editSubsite,
                      address: {
                        ...editSubsite.address,
                        zipCode: e.target.value,
                      },
                    })
                  }
                />
                <TextField
                  margin="dense"
                  label="Country"
                  fullWidth
                  value={editSubsite.address.country}
                  onChange={(e) =>
                    setEditSubsite({
                      ...editSubsite,
                      address: {
                        ...editSubsite.address,
                        country: e.target.value,
                      },
                    })
                  }
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEditSubsiteDialogOpen(false)} color="primary">
                Cancel
              </Button>
              <Button onClick={handleEditSubsite} color="primary" disabled={!editSubsite.name}>
                Save Changes
              </Button>
            </DialogActions>
          </Dialog>

          {/* Data Management Dialog - Using CRUD Modal */}
          <CRUDModal
            open={dataManagementDialogOpen}
            onClose={() => {
              handleCloseDataManagementDialog()
            }}
            workspaceFormShortcut={{
              crudEntity: "siteManagementModal3",
              crudMode: "edit",
            }}
            title="Data access"
            icon={<SettingsIcon />}
            mode="edit"
            onSave={handleUpdateDataManagement}
            saveButtonText="Save"
            maxWidth="sm"
            fullWidth
          >
            <Typography variant="body2" color="text.secondary" paragraph>
              Select which sites and subsites should be accessible.
            </Typography>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>Accessible Sites</Typography>
              <FormControl fullWidth>
                {state.sites?.map((site) => (
                  <FormControlLabel
                    key={site.siteID}
                    control={
                      <Checkbox
                        checked={siteDataConfig.accessibleSites.includes(site.siteID)}
                        onChange={(e) => {
                          setSiteDataConfig(prev => ({
                            ...prev,
                            accessibleSites: e.target.checked 
                              ? [...prev.accessibleSites, site.siteID]
                              : prev.accessibleSites.filter(id => id !== site.siteID)
                          }))
                        }}
                      />
                    }
                    label={site.name}
                  />
                ))}
              </FormControl>
            </Box>
            
            <Box>
              <Typography variant="subtitle1" gutterBottom>Accessible Subsites</Typography>
              <FormControl fullWidth>
                {state.sites?.map((site) => (
                  site.subsites && Object.values(site.subsites).map((subsite: any) => (
                    <FormControlLabel
                      key={subsite.subsiteID}
                      control={
                        <Checkbox
                          checked={siteDataConfig.accessibleSubsites.includes(subsite.subsiteID)}
                          onChange={(e) => {
                            setSiteDataConfig(prev => ({
                              ...prev,
                              accessibleSubsites: e.target.checked
                                ? [...prev.accessibleSubsites, subsite.subsiteID]
                                : prev.accessibleSubsites.filter(id => id !== subsite.subsiteID)
                            }))
                          }}
                        />
                      }
                      label={`${subsite.name} (${site.name})`}
                    />
                  ))
                ))}
              </FormControl>
            </Box>
          </CRUDModal>

          {/* Create Site Account Modal */}
          <CRUDModal
            open={createAccountDialogOpen}
            onClose={(reason) => {
              setCreateAccountDialogOpen(false)
              if (isCrudModalHardDismiss(reason)) {
                setAccountForm({
                  email: "",
                  password: "",
                  confirmPassword: "",
                  siteId: "",
                  subsiteId: "",
                })
              }
            }}
            workspaceFormShortcut={{
              crudEntity: "siteManagementModal4",
              crudMode: "create",
            }}
            title="Create Site Account"
            icon={<PersonIcon />}
            mode="create"
            onSave={handleCreateSiteAccount}
            saveButtonText="Create Account"
            maxWidth="sm"
          >
            <TextField
              autoFocus
              margin="dense"
              label="Email"
              type="email"
              fullWidth
              required
              value={accountForm.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAccountForm({ ...accountForm, email: e.target.value })}
              error={Boolean(accountForm.email) && !isEmailValid}
              helperText={Boolean(accountForm.email) && !isEmailValid ? "Invalid email format" : ""}
            />
            <TextField
              margin="dense"
              label="Password"
              type="password"
              fullWidth
              required
              value={accountForm.password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAccountForm({ ...accountForm, password: e.target.value })}
              error={Boolean(accountForm.password) && !isPasswordValid}
              helperText={Boolean(accountForm.password) && !isPasswordValid ? "Password must be at least 6 characters" : ""}
            />
            <TextField
              margin="dense"
              label="Confirm Password"
              type="password"
              fullWidth
              required
              value={accountForm.confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAccountForm({ ...accountForm, confirmPassword: e.target.value })}
              error={Boolean(accountForm.confirmPassword) && !doPasswordsMatch}
              helperText={Boolean(accountForm.confirmPassword) && !doPasswordsMatch ? "Passwords do not match" : ""}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 1 }}>
              This will create a login account for site/subsite devices. The account will be added to company users and recognized as an employee for usage purposes.
            </Typography>
            <FormControl fullWidth margin="dense">
              <InputLabel>Site</InputLabel>
              <Select
                value={accountForm.siteId}
                onChange={(e: SelectChangeEvent) => setAccountForm({ ...accountForm, siteId: e.target.value as string, subsiteId: "" })}
                label="Site"
                required
              >
                {state.sites?.map((site) => (
                  <MenuItem key={site.siteID} value={site.siteID}>
                    {site.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="dense">
              <InputLabel>Subsite (Optional)</InputLabel>
              <Select
                value={accountForm.subsiteId}
                onChange={(e) => setAccountForm({ ...accountForm, subsiteId: e.target.value })}
                label="Subsite (Optional)"
                disabled={!accountForm.siteId}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {accountForm.siteId &&
                  state.sites?.find((site) => site.siteID === accountForm.siteId)?.subsites &&
                  Object.values(state.sites.find((site) => site.siteID === accountForm.siteId)?.subsites || {}).map(
                    (subsite: any) => (
                      <MenuItem key={subsite.subsiteID} value={subsite.subsiteID}>
                        {subsite.name}
                      </MenuItem>
                    ),
                  )}
              </Select>
            </FormControl>
          </CRUDModal>


          <Snackbar open={snackbarState.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
            <Alert onClose={handleCloseSnackbar} severity={snackbarState.severity} sx={{ width: "100%" }}>
              {snackbarState.message}
            </Alert>
          </Snackbar>
        </CardContent>
      </Card>
    </Box>
    </RequireCompanyContext>
  )
}

export default SiteManagement
