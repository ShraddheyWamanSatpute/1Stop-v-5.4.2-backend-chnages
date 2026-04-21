"use client"

import { themeConfig } from "../../theme/AppTheme";
import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from "react"
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Snackbar,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
  IconButton,
} from "@mui/material"
import {
  Edit,
  Save,
  Person as PersonIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  AccountBalance as BankIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  PhotoCamera as PhotoCameraIcon,
  Delete as DeleteIcon,
  Tune as TuneIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  History as HistoryIcon,
} from "@mui/icons-material"
import { useSettings } from "../../backend/context/SettingsContext"
import { useNavigate, useLocation } from "react-router-dom"
import { useCompany } from "../../backend/context/CompanyContext"
import { useWorkspaceNavigation } from "../context/WorkspaceNavigationContext"
import { buildShortcutHref } from "../utils/workspaceShortcuts"
import { sidebarSectionCatalog, normalizeSidebarSectionVisibility } from "../utils/workspaceNavigationVisibility"
import { getCompanyLayout, type ModuleKey } from "../layouts/companyLayout"
import { getNavigationPermissionTarget } from "../utils/workspaceNavigationVisibility"
import usePersistentBoolean from "../hooks/usePersistentBoolean"

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
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
      style={{ height: "100%", display: value === index ? "flex" : "none", flexDirection: "column" }}
    >
      {/* Keep content mounted to prevent UI flashing on tab switches */}
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>{children}</Box>
    </div>
  )
}

function a11yProps(index: number) {
  return {
    id: `settings-tab-${index}`,
    "aria-controls": `settings-tabpanel-${index}`,
  }
}

const Settings = () => {
  const { state, updatePersonal, updatePreferences, refreshSettings, updateAvatar } = useSettings()
  const { getUserPermissions, hasPermission, state: companyState } = useCompany()
  const { favorites, recents, toggleFavorite, isFavorite, pageShortcuts, formShortcuts } = useWorkspaceNavigation()
  const navigate = useNavigate()
  const location = useLocation()
  // Store lowercase path to make suppression case-insensitive (react-router can match case-insensitively)
  const suppressRouteSyncOnceRef = useRef<string>("")
  const contentScrollRef = useRef<HTMLDivElement | null>(null)

  const tabsConfig = useMemo(
    () => [
      { label: "Personal Info", slug: "personal", icon: <PersonIcon /> },
      { label: "Account & Security", slug: "account", icon: <SecurityIcon /> },
      { label: "Preferences", slug: "preferences", icon: <NotificationsIcon /> },
      { label: "Companies", slug: "companies", icon: <BusinessIcon /> },
      { label: "Navigation", slug: "navigation", icon: <TuneIcon /> },
    ],
    [],
  )

  const slugToPascalPath = (slug: string) => {
    return slug.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join("")
  }

  const [activeTab, setActiveTab] = useState(0)
  const [isTabsExpanded, setIsTabsExpanded] = usePersistentBoolean("app:ui:section-tabs-expanded", true)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [shortcutSearch, setShortcutSearch] = useState("")
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoRemoved, setPhotoRemoved] = useState(false)

  // Settings tabs keep their content mounted; reset scroll on tab change to avoid "sticky"/"bouncy" navigation feel.
  // Use layout effect to update before paint (prevents visible bounce).
  useLayoutEffect(() => {
    const el = contentScrollRef.current
    if (!el) return
    try {
      el.scrollTo({ top: 0, left: 0, behavior: "auto" })
    } catch {
      el.scrollTop = 0
    }
  }, [activeTab])

  const normalizedShortcutSearch = shortcutSearch.trim().toLowerCase()

  const layout = useMemo(() => getCompanyLayout(companyState?.company?.companyType), [companyState?.company?.companyType])
  const sidebarVisibility = useMemo(
    () => normalizeSidebarSectionVisibility((state.settings?.preferences as any)?.sidebarSections),
    [state.settings?.preferences],
  )
  const effectivePermissions = useMemo(() => getUserPermissions?.(), [getUserPermissions])

  const canAccessShortcut = useCallback(
    (path: string) => {
      const target = getNavigationPermissionTarget(path)
      if (target.alwaysVisible) return true
      if (target.sectionKey && sidebarVisibility[target.sectionKey] === false) return false
      if (target.moduleKey && layout.disabledModules.has(target.moduleKey as ModuleKey)) return false
      if (target.sectionKey === "supply" && !layout.enabledFeatures.has("supply")) return false
      if (companyState?.loading) return true
      if (!target.moduleKey) return true
      if (!target.pageKey) {
        const modulePermissions = (effectivePermissions as any)?.modules?.[target.moduleKey]
        if (!modulePermissions) return false
        return Object.values(modulePermissions).some((page: any) => Boolean(page?.view))
      }
      return hasPermission(target.moduleKey, target.pageKey, "view")
    },
    [companyState?.loading, effectivePermissions, hasPermission, layout, sidebarVisibility],
  )

  const filteredPageShortcuts = useMemo(() => {
    const base = pageShortcuts.filter((item) => canAccessShortcut(item.path))
    if (!normalizedShortcutSearch) return base
    return base.filter((item) => {
      const haystack = `${item.label} ${item.path} ${item.kind}`.toLowerCase()
      return haystack.includes(normalizedShortcutSearch)
    })
  }, [canAccessShortcut, normalizedShortcutSearch, pageShortcuts])

  const filteredFormShortcuts = useMemo(() => {
    const base = formShortcuts.filter((item) => canAccessShortcut(item.path))
    if (!normalizedShortcutSearch) return base
    return base.filter((item) => {
      const haystack = `${item.label} ${item.path} ${item.kind} ${item.search || ""}`.toLowerCase()
      return haystack.includes(normalizedShortcutSearch)
    })
  }, [canAccessShortcut, formShortcuts, normalizedShortcutSearch])

  const accessibleFavorites = useMemo(
    () => favorites.filter((item) => canAccessShortcut(item.path)),
    [canAccessShortcut, favorites],
  )

  const accessibleRecents = useMemo(
    () => recents.filter((item) => canAccessShortcut(item.path)),
    [canAccessShortcut, recents],
  )

  // Form state for personal info
  const [personalForm, setPersonalForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phone: "",
  })

  // Form state for account & security
  const [accountForm, setAccountForm] = useState({
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
    bankDetails: {
      accountHolderName: "",
      bankName: "",
      accountNumber: "",
      sortCode: "",
      iban: "",
    },
    niNumber: "",
    taxCode: "",
    emergencyContact: {
      name: "",
      relationship: "",
      phone: "",
      email: "",
    },
  })

  // Form state for companies
  const [companies, setCompanies] = useState<any[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(false)

  // Form state for preferences
  const [preferencesForm, setPreferencesForm] = useState({
    theme: "light" as "light" | "dark",
    notifications: {
      email: true,
      push: true,
      sms: false,
    },
    // Extended notification preferences for all sections
    notificationPreferences: {
      // HR Section
      hr: {
        newEmployee: { email: true, push: true, sms: false },
        employeeUpdate: { email: true, push: false, sms: false },
        leaveRequest: { email: true, push: true, sms: false },
        shiftChange: { email: true, push: true, sms: false },
        payrollUpdate: { email: true, push: false, sms: false },
      },
      // Stock Section
      stock: {
        lowStock: { email: true, push: true, sms: false },
        stockUpdate: { email: true, push: false, sms: false },
        orderReceived: { email: true, push: true, sms: false },
        stockAlert: { email: true, push: true, sms: false },
      },
      // Finance Section
      finance: {
        invoiceCreated: { email: true, push: false, sms: false },
        paymentReceived: { email: true, push: true, sms: false },
        paymentDue: { email: true, push: true, sms: false },
        financialReport: { email: true, push: false, sms: false },
      },
      // Booking Section
      booking: {
        newBooking: { email: true, push: true, sms: false },
        bookingUpdate: { email: true, push: true, sms: false },
        bookingCancelled: { email: true, push: true, sms: false },
      },
      // System
      system: {
        systemNotifications: { email: true, push: false, sms: false },
        securityAlerts: { email: true, push: true, sms: true },
        maintenance: { email: true, push: false, sms: false },
      },
      // Marketing
      marketing: {
        promotions: { email: false, push: false, sms: false },
        newsletters: { email: false, push: false, sms: false },
      },
    },
    emailPreferences: {
      lowStock: true,
      orderUpdates: true,
      systemNotifications: true,
      marketing: false,
    },
    sidebarSections: {
      dashboard: true,
      stock: true,
      hr: true,
      bookings: true,
      pos: true,
      finance: true,
      supply: true,
      messenger: true,
      company: true,
      settings: true,
    },
    language: "en",
  })

  // Track if we've initialized forms to prevent unnecessary updates
  const formsInitializedRef = useRef(false)
  
  // Update form values when settings state changes
  // Only populate once when data is received, don't keep updating
  useEffect(() => {
    // Don't clobber user edits mid-edit; only sync from context when not editing.
    // Only initialize once when settings are first loaded (not loading and we haven't initialized)
    if (!state.loading && !editMode && (!formsInitializedRef.current || state.settings?.personal?.email)) {
      setPersonalForm({
        firstName: state.settings.personal.firstName || "",
        middleName: state.settings.personal.middleName || "",
        lastName: state.settings.personal.lastName || "",
        email: state.settings.personal.email || "",
        phone: state.settings.personal.phone || "",
      })
      
      // Set photo preview from avatar
      if (state.settings.personal.avatar) {
        setPhotoPreview(state.settings.personal.avatar)
      } else {
        setPhotoPreview(null)
      }
      setPhotoRemoved(false)

      setAccountForm({
        address: {
          street: state.settings.personal.address?.street || "",
          city: state.settings.personal.address?.city || "",
          state: state.settings.personal.address?.state || "",
          zipCode: state.settings.personal.address?.zipCode || "",
          country: state.settings.personal.address?.country || "",
        },
        bankDetails: {
          accountHolderName: state.settings.personal.bankDetails?.accountHolderName || "",
          bankName: state.settings.personal.bankDetails?.bankName || "",
          accountNumber: state.settings.personal.bankDetails?.accountNumber || "",
          sortCode: state.settings.personal.bankDetails?.sortCode || "",
          iban: state.settings.personal.bankDetails?.iban || "",
        },
        niNumber: state.settings.personal.niNumber || "",
        taxCode: state.settings.personal.taxCode || "",
        emergencyContact: {
          name: state.settings.personal.emergencyContact?.name || "",
          relationship: state.settings.personal.emergencyContact?.relationship || "",
          phone: state.settings.personal.emergencyContact?.phone || "",
          email: state.settings.personal.emergencyContact?.email || "",
        },
      })

      setPreferencesForm({
        theme: state.settings.preferences.theme,
        notifications: { ...state.settings.preferences.notifications },
        notificationPreferences: (state.settings.preferences as any).notificationPreferences || {
          hr: {
            newEmployee: { email: true, push: true, sms: false },
            employeeUpdate: { email: true, push: false, sms: false },
            leaveRequest: { email: true, push: true, sms: false },
            shiftChange: { email: true, push: true, sms: false },
            payrollUpdate: { email: true, push: false, sms: false },
          },
          stock: {
            lowStock: { email: true, push: true, sms: false },
            stockUpdate: { email: true, push: false, sms: false },
            orderReceived: { email: true, push: true, sms: false },
            stockAlert: { email: true, push: true, sms: false },
          },
          finance: {
            invoiceCreated: { email: true, push: false, sms: false },
            paymentReceived: { email: true, push: true, sms: false },
            paymentDue: { email: true, push: true, sms: false },
            financialReport: { email: true, push: false, sms: false },
          },
          booking: {
            newBooking: { email: true, push: true, sms: false },
            bookingUpdate: { email: true, push: true, sms: false },
            bookingCancelled: { email: true, push: true, sms: false },
          },
          system: {
            systemNotifications: { email: true, push: false, sms: false },
            securityAlerts: { email: true, push: true, sms: true },
            maintenance: { email: true, push: false, sms: false },
          },
          marketing: {
            promotions: { email: false, push: false, sms: false },
            newsletters: { email: false, push: false, sms: false },
          },
        },
        emailPreferences: { ...state.settings.preferences.emailPreferences },
        sidebarSections: normalizeSidebarSectionVisibility((state.settings.preferences as any).sidebarSections),
        language: state.settings.preferences.language,
      })
      
      formsInitializedRef.current = true
    }
  }, [state.loading, state.settings, editMode])
  
  // Reset initialization flag when company changes
  useEffect(() => {
    formsInitializedRef.current = false
  }, [state.user?.currentCompanyID])

  // Remove the automatic refresh - SettingsContext handles loading settings on mount
  // Only refresh when explicitly needed (e.g., after saving changes)
  // This prevents unnecessary refreshes that cause UI flashing

  const tabCount = tabsConfig.length

  useEffect(() => {
    if (activeTab >= tabCount) {
      setActiveTab(0)
    }
  }, [activeTab, tabCount])

  useEffect(() => {
    if (!tabCount) {
      return
    }

    const pathWithoutTrailingSlash = location.pathname.replace(/\/+$/, "")
    const pathLower = pathWithoutTrailingSlash.toLowerCase()
    const isSuppressed = suppressRouteSyncOnceRef.current === pathLower
    if (isSuppressed) {
      suppressRouteSyncOnceRef.current = ""
    }
    const segments = pathWithoutTrailingSlash.split("/").filter(Boolean)
    const settingsIndex = segments.findIndex((segment) => segment.toLowerCase() === "settings")
    const tabSegment = settingsIndex !== -1 ? segments[settingsIndex + 1] : undefined

    const defaultSlug = tabsConfig[0]?.slug

    if (!tabSegment) {
      if (defaultSlug) {
        const defaultPath = `/Settings/${slugToPascalPath(defaultSlug)}`
        if (!isSuppressed && pathLower !== defaultPath.toLowerCase()) {
          navigate(defaultPath, { replace: true })
        }
      }
      if (activeTab !== 0) {
        setActiveTab(0)
        setEditMode(false)
      }
      return
    }

    // Match tab by slug, handling PascalCase paths
    const tabSegLower = tabSegment.toLowerCase()
    const matchedIndex = tabsConfig.findIndex((tab) => {
      const pascalSlug = slugToPascalPath(tab.slug)
      return tab.slug.toLowerCase() === tabSegLower || pascalSlug.toLowerCase() === tabSegLower
    })
    if (matchedIndex === -1) {
      if (defaultSlug) {
        const defaultPath = `/Settings/${slugToPascalPath(defaultSlug)}`
        if (!isSuppressed && pathLower !== defaultPath.toLowerCase()) {
          navigate(defaultPath, { replace: true })
        }
      }
      if (activeTab !== 0) {
        setActiveTab(0)
        setEditMode(false)
      }
      return
    }

    if (matchedIndex !== activeTab) {
      setActiveTab(matchedIndex)
      setEditMode(false)
    }
  }, [activeTab, location.pathname, navigate, tabCount, tabsConfig])

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue) // immediate UI feedback
    setEditMode(false)
    const selectedTab = tabsConfig[newValue]
    if (!selectedTab) {
      return
    }

    const targetPath = `/Settings/${slugToPascalPath(selectedTab.slug)}`
    const currentPath = location.pathname.replace(/\/+$/, "")
    if (currentPath.toLowerCase() !== targetPath.toLowerCase()) {
      suppressRouteSyncOnceRef.current = targetPath.toLowerCase()
      navigate(targetPath)
    }
  }

  const handleTabClick = (newValue: number) => {
    // Drive tab switching from explicit click handlers to avoid any MUI value mismatch
    handleTabChange({} as any, newValue)
  }

  const toggleTabsExpanded = () => {
    setIsTabsExpanded(!isTabsExpanded)
  }

  const handleSave = async () => {
    if (activeTab === 3) {
      setErrorMessage("The Companies tab is read-only")
      return
    }

    setSaving(true)

    try {
      // Determine which tab is active and save appropriate settings
      if (activeTab === 0) {
        // Personal info - upload photo if changed, or clear if removed
        if (photoFile) {
          const avatarUrl = await updateAvatar(photoFile)
          if (avatarUrl) {
            await updatePersonal({ ...personalForm, avatar: avatarUrl })
            // Replace local data-url preview with the real stored URL (smaller + consistent)
            setPhotoPreview(avatarUrl)
          } else {
            throw new Error("Failed to upload avatar")
          }
        } else if (photoRemoved) {
          // Photo was removed - clear avatar
          await updatePersonal({ ...personalForm, avatar: "" })
          setPhotoPreview(null)
        } else {
          await updatePersonal(personalForm)
        }
      } else if (activeTab === 1) {
        // Account & Security settings
        await updatePersonal({ ...personalForm, ...accountForm })
      } else if (activeTab === 2) {
        // Preferences
        await updatePreferences(preferencesForm)
      } else if (activeTab === 4) {
        // Navigation (also stored in preferences)
        await updatePreferences(preferencesForm)
      }

      setSuccessMessage("Settings saved successfully")
      setEditMode(false)
      setPhotoFile(null) // Clear photo file after successful save
      setPhotoRemoved(false) // Reset photo removal flag
      
      // Refresh settings after save to get latest data from server
      // But only if not already loading to prevent flashing
      if (!state.loading) {
        refreshSettings()
      }
    } catch (error) {
      console.error("Error saving settings:", error)
      setErrorMessage("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  // Handle photo change
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Please select a valid image file')
        return
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setErrorMessage('Image size must be less than 5MB')
        return
      }
      
      setPhotoFile(file)
      setPhotoRemoved(false) // Reset removal flag when new photo is selected
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        setPhotoPreview(result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemovePhoto = () => {
    setPhotoPreview(null)
    setPhotoFile(null)
    setPhotoRemoved(true)
    // Mark avatar for removal - will be cleared on save
  }

  const handleCloseSnackbar = () => {
    setSuccessMessage(null)
    setErrorMessage(null)
  }

  // Handle personal form changes
  const handlePersonalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPersonalForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Handle account form changes
  const handleAccountChange = (section: string, field: string, value: string) => {
    if (section === "niNumber" || section === "taxCode") {
      // Handle top-level fields
      setAccountForm((prev) => ({
        ...prev,
        [section]: value,
      }))
    } else {
      // Handle nested object fields
      setAccountForm((prev) => ({
        ...prev,
        [section]: {
          ...(prev[section as keyof typeof prev] as object),
          [field]: value,
        },
      }))
    }
  }

  // Handle address autocomplete (Google Places integration)

  // Load user companies from SettingsContext (no extra fetching here)
  // SettingsContext is responsible for loading companies (cache + Firebase).
  const loadUserCompanies = () => {
    setLoadingCompanies(true)
    try {
      const sourceCompanies = state.user?.companies
      if (sourceCompanies && Array.isArray(sourceCompanies)) {
        const userCompanies = sourceCompanies.map((company) => ({
          id: company.companyID,
          name: company.companyName,
          role: company.role,
          department: company.department,
          joinedAt: new Date(company.joinedAt).toLocaleDateString(),
          status: company.isDefault ? "Default" : "Active",
        }))
        setCompanies(userCompanies)
      } else {
        setCompanies([])
      }
    } finally {
      setLoadingCompanies(false)
    }
  }

  // Load companies when tab is accessed
  useEffect(() => {
    if (activeTab === 3) {
      loadUserCompanies()
    }
  }, [activeTab, state.user?.companies])

  // Handle preferences form changes
  const handleNotificationChange = (name: string, checked: boolean) => {
    setPreferencesForm((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [name]: checked,
      },
    }))
  }

  const handleEmailPrefChange = (name: string, checked: boolean) => {
    setPreferencesForm((prev) => ({
      ...prev,
      emailPreferences: {
        ...prev.emailPreferences,
        [name]: checked,
      },
    }))
  }

  const handleNotificationPrefChange = (
    section: string,
    category: string,
    type: "email" | "push" | "sms",
    checked: boolean
  ) => {
    setPreferencesForm((prev) => ({
      ...prev,
      notificationPreferences: {
        ...prev.notificationPreferences,
        [section]: {
          ...prev.notificationPreferences[section as keyof typeof prev.notificationPreferences],
          [category]: {
            ...prev.notificationPreferences[section as keyof typeof prev.notificationPreferences][category],
            [type]: checked,
          },
        },
      },
    }))
  }

  const handleLanguageChange = (event: SelectChangeEvent<string>) => {
    setPreferencesForm((prev) => ({
      ...prev,
      language: event.target.value,
    }))
  }

  const handleSidebarSectionChange = (key: string, checked: boolean) => {
    setPreferencesForm((prev) => ({
      ...prev,
      sidebarSections: {
        ...(prev.sidebarSections as any),
        [key]: checked,
        settings: true,
      },
    }))
  }

  return (
    <Box
      sx={{
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 64px)",
        overflow: "hidden",
        m: 0,
        mt: isTabsExpanded ? 0 : -3,
        p: 0,
        transition: "margin 0.3s ease",
      }}
    >
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: "100%" }}>
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: "100%" }}>
          {errorMessage}
        </Alert>
      </Snackbar>

      {isTabsExpanded && (
        <Paper 
          sx={{ 
            borderBottom: 1, 
            borderColor: "divider", 
            bgcolor: themeConfig.brandColors.navy, 
            color: themeConfig.brandColors.offWhite,
            m: 0,
            p: 0,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2 }}>
            <Tabs
              value={activeTab}
              // We intentionally handle clicks on each Tab to avoid any index/value mismatches.
              onChange={() => {}}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                flexGrow: 1,
                "& .MuiTabs-scrollButtons": {
                  "&.Mui-disabled": {
                    opacity: 0,
                    width: 0,
                  },
                },
                "& .MuiTabs-scroller": {
                  overflow: "visible !important",
                },
                "& .MuiTab-root": {
                  color: themeConfig.brandColors.offWhite,
                  opacity: 0.7,
                  "&.Mui-selected": {
                    color: themeConfig.brandColors.offWhite,
                    opacity: 1,
                  },
                },
                "& .MuiTabs-indicator": {
                  backgroundColor: themeConfig.brandColors.offWhite,
                },
              }}
            >
              {tabsConfig.map((tab, index) => (
                <Tab
                  key={tab.slug}
                  value={index}
                  icon={tab.icon}
                  label={tab.label}
                  {...a11yProps(index)}
                  onClick={() => handleTabClick(index)}
                />
              ))}
            </Tabs>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Button
                onClick={editMode ? handleSave : () => setEditMode(true)}
                variant={editMode ? "contained" : "outlined"}
                color="inherit"
                size="small"
                startIcon={editMode ? <Save /> : <Edit />}
                disabled={saving || activeTab === 3}
              >
                {activeTab === 3 ? "Read only" : editMode ? "Save" : "Edit"}
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          bgcolor: "background.paper",
          m: 0,
          p: 0,
          lineHeight: 0,
        }}
      >
        <IconButton
          onClick={toggleTabsExpanded}
          size="small"
          sx={{
            color: "text.primary",
            m: 0,
            p: 0.5,
            "&:hover": {
              bgcolor: "transparent",
              opacity: 0.7,
            },
          }}
        >
          {isTabsExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Box>

      {/* Main Content */}
      <Box
        ref={contentScrollRef}
        sx={{
          flexGrow: 1,
          width: "100%",
          height: "100%",
          overflowY: "auto",
          overflowX: "hidden",
          overscrollBehavior: "contain",
          scrollBehavior: "auto",
          scrollbarGutter: "stable",
          overflowAnchor: "none",
        }}
      >
        {/* Personal Info Tab */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ p: 4, height: "100%", display: "flex", flexDirection: "column" }}>
            <Grid container spacing={4} sx={{ flexGrow: 1 }}>
              <Grid item xs={12} sm={4} md={3}>
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start" }}>
                  <Avatar
                    src={photoPreview || state.settings.personal.avatar || undefined}
                    sx={{ 
                      width: 150, 
                      height: 150, 
                      mb: 3,
                      bgcolor: themeConfig.brandColors.navy
                    }}
                  >
                    {!photoPreview && !state.settings.personal.avatar && (
                      <PersonIcon sx={{ fontSize: 75 }} />
                    )}
                  </Avatar>
                  {editMode && (
                    <Box sx={{ display: "flex", gap: 1.5, flexDirection: "column", width: "100%" }}>
                      <input
                        accept="image/*"
                        style={{ display: "none" }}
                        id="photo-upload"
                        type="file"
                        onChange={handlePhotoChange}
                      />
                      <label htmlFor="photo-upload">
                        <Button 
                          variant="outlined" 
                          component="span" 
                          startIcon={<PhotoCameraIcon />} 
                          size="small"
                          fullWidth
                        >
                          Upload
                        </Button>
                      </label>
                      {(photoPreview || state.settings.personal.avatar) && (
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          startIcon={<DeleteIcon />}
                          onClick={handleRemovePhoto}
                          fullWidth
                        >
                          Remove
                        </Button>
                      )}
                    </Box>
                  )}
                </Box>
              </Grid>
              <Grid item xs={12} sm={8} md={9}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="First Name"
                      name="firstName"
                      fullWidth
                      size="small"
                      value={personalForm.firstName}
                      onChange={handlePersonalChange}
                      disabled={!editMode}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Middle Name"
                      name="middleName"
                      fullWidth
                      size="small"
                      value={personalForm.middleName}
                      onChange={handlePersonalChange}
                      disabled={!editMode}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Last Name"
                      name="lastName"
                      fullWidth
                      size="small"
                      value={personalForm.lastName}
                      onChange={handlePersonalChange}
                      disabled={!editMode}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Email"
                      name="email"
                      fullWidth
                      size="small"
                      value={personalForm.email}
                      onChange={handlePersonalChange}
                      disabled={!editMode}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Phone"
                      name="phone"
                      fullWidth
                      size="small"
                      value={personalForm.phone}
                      onChange={handlePersonalChange}
                      disabled={!editMode}
                    />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* Account & Security Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ p: 4, height: "100%" }}>
            <Grid container spacing={4}>
              {/* Address Section */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 3, display: "flex", alignItems: "center", gap: 1 }}>
                  <LocationIcon />
                  Address Information
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      label="Street Address"
                      name="street"
                      fullWidth
                      size="small"
                      value={accountForm.address.street}
                      onChange={(e) => handleAccountChange("address", "street", e.target.value)}
                      disabled={!editMode}
                      placeholder="Enter your street address"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="City"
                      name="city"
                      fullWidth
                      size="small"
                      value={accountForm.address.city}
                      onChange={(e) => handleAccountChange("address", "city", e.target.value)}
                      disabled={!editMode}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="State/Province"
                      name="state"
                      fullWidth
                      size="small"
                      value={accountForm.address.state}
                      onChange={(e) => handleAccountChange("address", "state", e.target.value)}
                      disabled={!editMode}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="ZIP/Postal Code"
                      name="zipCode"
                      fullWidth
                      size="small"
                      value={accountForm.address.zipCode}
                      onChange={(e) => handleAccountChange("address", "zipCode", e.target.value)}
                      disabled={!editMode}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Country"
                      name="country"
                      fullWidth
                      size="small"
                      value={accountForm.address.country}
                      onChange={(e) => handleAccountChange("address", "country", e.target.value)}
                      disabled={!editMode}
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* Bank Details Section */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 3, display: "flex", alignItems: "center", gap: 1 }}>
                  <BankIcon />
                  Bank Details
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      label="Account Holder Name"
                      name="accountHolderName"
                      fullWidth
                      size="small"
                      value={accountForm.bankDetails.accountHolderName}
                      onChange={(e) => handleAccountChange("bankDetails", "accountHolderName", e.target.value)}
                      disabled={!editMode}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Bank Name"
                      name="bankName"
                      fullWidth
                      size="small"
                      value={accountForm.bankDetails.bankName}
                      onChange={(e) => handleAccountChange("bankDetails", "bankName", e.target.value)}
                      disabled={!editMode}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Account Number"
                      name="accountNumber"
                      fullWidth
                      size="small"
                      value={accountForm.bankDetails.accountNumber}
                      onChange={(e) => handleAccountChange("bankDetails", "accountNumber", e.target.value)}
                      disabled={!editMode}
                      type="password"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Sort Code"
                      name="sortCode"
                      fullWidth
                      size="small"
                      value={accountForm.bankDetails.sortCode}
                      onChange={(e) => handleAccountChange("bankDetails", "sortCode", e.target.value)}
                      disabled={!editMode}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="IBAN"
                      name="iban"
                      fullWidth
                      size="small"
                      value={accountForm.bankDetails.iban}
                      onChange={(e) => handleAccountChange("bankDetails", "iban", e.target.value)}
                      disabled={!editMode}
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* Tax & Identification Section */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Tax & Identification
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="National Insurance Number"
                      name="niNumber"
                      fullWidth
                      size="small"
                      value={accountForm.niNumber}
                      onChange={(e) => handleAccountChange("niNumber", "", e.target.value)}
                      disabled={!editMode}
                      placeholder="XX 12 34 56 X"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Tax Code"
                      name="taxCode"
                      fullWidth
                      size="small"
                      value={accountForm.taxCode}
                      onChange={(e) => handleAccountChange("taxCode", "", e.target.value)}
                      disabled={!editMode}
                      placeholder="1257L"
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* Emergency Contact Section */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Emergency Contact
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Contact Name"
                      name="name"
                      fullWidth
                      size="small"
                      value={accountForm.emergencyContact.name}
                      onChange={(e) => handleAccountChange("emergencyContact", "name", e.target.value)}
                      disabled={!editMode}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Relationship"
                      name="relationship"
                      fullWidth
                      size="small"
                      value={accountForm.emergencyContact.relationship}
                      onChange={(e) => handleAccountChange("emergencyContact", "relationship", e.target.value)}
                      disabled={!editMode}
                      placeholder="e.g., Spouse, Parent, Sibling"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Phone Number"
                      name="phone"
                      fullWidth
                      size="small"
                      value={accountForm.emergencyContact.phone}
                      onChange={(e) => handleAccountChange("emergencyContact", "phone", e.target.value)}
                      disabled={!editMode}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Email Address"
                      name="email"
                      fullWidth
                      size="small"
                      value={accountForm.emergencyContact.email}
                      onChange={(e) => handleAccountChange("emergencyContact", "email", e.target.value)}
                      disabled={!editMode}
                      type="email"
                    />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* Preferences Tab */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ p: 4, height: "100%" }}>
            <Grid container spacing={4}>
              {/* Global Notification Settings */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Global Notification Settings
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferencesForm.notifications.email}
                          onChange={(e) => handleNotificationChange("email", e.target.checked)}
                          disabled={!editMode}
                          color="primary"
                        />
                      }
                      label="Email Notifications"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferencesForm.notifications.push}
                          onChange={(e) => handleNotificationChange("push", e.target.checked)}
                          disabled={!editMode}
                          color="primary"
                        />
                      }
                      label="Push Notifications"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferencesForm.notifications.sms}
                          onChange={(e) => handleNotificationChange("sms", e.target.checked)}
                          disabled={!editMode}
                          color="primary"
                        />
                      }
                      label="SMS Notifications"
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* HR Notifications */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  HR Notifications
                </Typography>
                <Grid container spacing={3}>
                  {Object.entries(preferencesForm.notificationPreferences.hr).map(([key, value]) => (
                    <Grid item xs={12} sm={6} md={4} key={key}>
                      <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, textTransform: "capitalize" }}>
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </Typography>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={value.email}
                                onChange={(e) => handleNotificationPrefChange("hr", key, "email", e.target.checked)}
                                disabled={!editMode}
                                size="small"
                                color="primary"
                              />
                            }
                            label="Email"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                checked={value.push}
                                onChange={(e) => handleNotificationPrefChange("hr", key, "push", e.target.checked)}
                                disabled={!editMode}
                                size="small"
                                color="primary"
                              />
                            }
                            label="Push"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                checked={value.sms}
                                onChange={(e) => handleNotificationPrefChange("hr", key, "sms", e.target.checked)}
                                disabled={!editMode}
                                size="small"
                                color="primary"
                              />
                            }
                            label="SMS"
                          />
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Grid>

              {/* Stock Notifications */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Stock Notifications
                </Typography>
                <Grid container spacing={3}>
                  {Object.entries(preferencesForm.notificationPreferences.stock).map(([key, value]) => (
                    <Grid item xs={12} sm={6} md={4} key={key}>
                      <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, textTransform: "capitalize" }}>
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </Typography>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={value.email}
                                onChange={(e) => handleNotificationPrefChange("stock", key, "email", e.target.checked)}
                                disabled={!editMode}
                                size="small"
                                color="primary"
                              />
                            }
                            label="Email"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                checked={value.push}
                                onChange={(e) => handleNotificationPrefChange("stock", key, "push", e.target.checked)}
                                disabled={!editMode}
                                size="small"
                                color="primary"
                              />
                            }
                            label="Push"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                checked={value.sms}
                                onChange={(e) => handleNotificationPrefChange("stock", key, "sms", e.target.checked)}
                                disabled={!editMode}
                                size="small"
                                color="primary"
                              />
                            }
                            label="SMS"
                          />
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Grid>

              {/* Finance Notifications */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Finance Notifications
                </Typography>
                <Grid container spacing={3}>
                  {Object.entries(preferencesForm.notificationPreferences.finance).map(([key, value]) => (
                    <Grid item xs={12} sm={6} md={4} key={key}>
                      <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, textTransform: "capitalize" }}>
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </Typography>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={value.email}
                                onChange={(e) => handleNotificationPrefChange("finance", key, "email", e.target.checked)}
                                disabled={!editMode}
                                size="small"
                                color="primary"
                              />
                            }
                            label="Email"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                checked={value.push}
                                onChange={(e) => handleNotificationPrefChange("finance", key, "push", e.target.checked)}
                                disabled={!editMode}
                                size="small"
                                color="primary"
                              />
                            }
                            label="Push"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                checked={value.sms}
                                onChange={(e) => handleNotificationPrefChange("finance", key, "sms", e.target.checked)}
                                disabled={!editMode}
                                size="small"
                                color="primary"
                              />
                            }
                            label="SMS"
                          />
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Grid>

              {/* Booking Notifications */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Booking Notifications
                </Typography>
                <Grid container spacing={3}>
                  {Object.entries(preferencesForm.notificationPreferences.booking).map(([key, value]) => (
                    <Grid item xs={12} sm={6} md={4} key={key}>
                      <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, textTransform: "capitalize" }}>
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </Typography>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={value.email}
                                onChange={(e) => handleNotificationPrefChange("booking", key, "email", e.target.checked)}
                                disabled={!editMode}
                                size="small"
                                color="primary"
                              />
                            }
                            label="Email"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                checked={value.push}
                                onChange={(e) => handleNotificationPrefChange("booking", key, "push", e.target.checked)}
                                disabled={!editMode}
                                size="small"
                                color="primary"
                              />
                            }
                            label="Push"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                checked={value.sms}
                                onChange={(e) => handleNotificationPrefChange("booking", key, "sms", e.target.checked)}
                                disabled={!editMode}
                                size="small"
                                color="primary"
                              />
                            }
                            label="SMS"
                          />
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Grid>

              {/* System Notifications */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  System Notifications
                </Typography>
                <Grid container spacing={3}>
                  {Object.entries(preferencesForm.notificationPreferences.system).map(([key, value]) => (
                    <Grid item xs={12} sm={6} md={4} key={key}>
                      <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, textTransform: "capitalize" }}>
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </Typography>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={value.email}
                                onChange={(e) => handleNotificationPrefChange("system", key, "email", e.target.checked)}
                                disabled={!editMode}
                                size="small"
                                color="primary"
                              />
                            }
                            label="Email"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                checked={value.push}
                                onChange={(e) => handleNotificationPrefChange("system", key, "push", e.target.checked)}
                                disabled={!editMode}
                                size="small"
                                color="primary"
                              />
                            }
                            label="Push"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                checked={value.sms}
                                onChange={(e) => handleNotificationPrefChange("system", key, "sms", e.target.checked)}
                                disabled={!editMode}
                                size="small"
                                color="primary"
                              />
                            }
                            label="SMS"
                          />
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Grid>

              {/* Marketing Notifications */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Marketing Notifications
                </Typography>
                <Grid container spacing={3}>
                  {Object.entries(preferencesForm.notificationPreferences.marketing).map(([key, value]) => (
                    <Grid item xs={12} sm={6} md={4} key={key}>
                      <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, textTransform: "capitalize" }}>
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </Typography>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={value.email}
                                onChange={(e) => handleNotificationPrefChange("marketing", key, "email", e.target.checked)}
                                disabled={!editMode}
                                size="small"
                                color="primary"
                              />
                            }
                            label="Email"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                checked={value.push}
                                onChange={(e) => handleNotificationPrefChange("marketing", key, "push", e.target.checked)}
                                disabled={!editMode}
                                size="small"
                                color="primary"
                              />
                            }
                            label="Push"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                checked={value.sms}
                                onChange={(e) => handleNotificationPrefChange("marketing", key, "sms", e.target.checked)}
                                disabled={!editMode}
                                size="small"
                                color="primary"
                              />
                            }
                            label="SMS"
                          />
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Grid>

              {/* Language & Theme */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Language & Theme
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth disabled={!editMode} size="small">
                      <InputLabel id="language-select-label">Language</InputLabel>
                      <Select
                        labelId="language-select-label"
                        value={preferencesForm.language}
                        onChange={handleLanguageChange}
                        label="Language"
                      >
                        <MenuItem value="en">English</MenuItem>
                        <MenuItem value="fr">French</MenuItem>
                        <MenuItem value="es">Spanish</MenuItem>
                        <MenuItem value="de">German</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferencesForm.theme === "dark"}
                          onChange={(e) =>
                            setPreferencesForm((prev) => ({
                              ...prev,
                              theme: e.target.checked ? "dark" : "light",
                            }))
                          }
                          disabled={!editMode}
                          color="primary"
                        />
                      }
                      label="Dark Mode"
                    />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* Companies Tab */}
        <TabPanel value={activeTab} index={3}>
          <Box sx={{ p: 4, height: "100%" }}>
            <Grid container spacing={3}>
              {companies.length > 0 ? (
                companies.map((company, idx) => (
                  <Grid
                    item
                    xs={12}
                    sm={6}
                    md={4}
                    key={company.id || `${company.name || "company"}-${idx}`}
                  >
                    <Box
                      sx={{
                        border: 1,
                        borderColor: "divider",
                        borderRadius: 1,
                        p: 2,
                        "&:hover": {
                          boxShadow: 2,
                        },
                        opacity: loadingCompanies ? 0.7 : 1,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
                        <BusinessIcon sx={{ mr: 1, color: themeConfig.brandColors.navy, fontSize: 20 }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {company.name}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        <strong>Role:</strong>{" "}
                        {typeof company.role === "string"
                          ? company.role
                          : company.role && typeof company.role === "object"
                            ? String((company.role as any).name || (company.role as any).label || (company.role as any).role || "—")
                            : String(company.role ?? "—")}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        <strong>Department:</strong> {company.department}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        <strong>Joined:</strong> {company.joinedAt}
                      </Typography>
                      <Chip
                        label={company.status}
                        color={company.status === "Default" ? "primary" : "success"}
                        size="small"
                      />
                    </Box>
                  </Grid>
                ))
              ) : (
                <Grid item xs={12} key="empty-companies">
                  <Box sx={{ p: 4, textAlign: "center", opacity: loadingCompanies ? 0.7 : 1 }}>
                    <BusinessIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No Companies Found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      You are not currently associated with any companies.
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Box>
        </TabPanel>

        {/* Navigation Tab */}
        <TabPanel value={activeTab} index={4}>
          <Box sx={{ p: 4, height: "100%" }}>
            <Grid container spacing={4}>
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Sidebar Sections
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Choose which sections are shown in the left navigation sidebar.
                </Typography>
                <Grid container spacing={1}>
                  {sidebarSectionCatalog.map((section) => {
                    const enabled = Boolean((preferencesForm.sidebarSections as any)?.[section.key])
                    return (
                      <Grid item xs={12} sm={6} md={4} key={section.key}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={section.alwaysVisible ? true : enabled}
                              onChange={(e) => handleSidebarSectionChange(section.key, e.target.checked)}
                              disabled={!editMode || Boolean(section.alwaysVisible)}
                            />
                          }
                          label={section.label}
                        />
                      </Grid>
                    )
                  })}
                </Grid>
              </Grid>

              <Grid item xs={12}>
                <Divider />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Favorite Control (All Pages and Forms)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Add or remove favorites from the full app catalog.
                </Typography>
                <TextField
                  size="small"
                  fullWidth
                  label="Search pages and forms"
                  value={shortcutSearch}
                  onChange={(e) => setShortcutSearch(e.target.value)}
                  placeholder="Search by page/form name or route"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
                  All Pages ({filteredPageShortcuts.length})
                </Typography>
                <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, maxHeight: 320, overflow: "auto", p: 1 }}>
                  {filteredPageShortcuts.map((item) => {
                    const favorite = isFavorite(item)
                    return (
                      <Box
                        key={item.key}
                        sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, py: 0.5 }}
                      >
                        <Button size="small" onClick={() => navigate(buildShortcutHref(item))} sx={{ justifyContent: "flex-start", flexGrow: 1 }}>
                          {item.label}
                        </Button>
                        <Button
                          size="small"
                          variant={favorite ? "contained" : "outlined"}
                          startIcon={favorite ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                          onClick={() => toggleFavorite(item)}
                        >
                          {favorite ? "Favorited" : "Favorite"}
                        </Button>
                      </Box>
                    )
                  })}
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
                  All Forms ({filteredFormShortcuts.length})
                </Typography>
                <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, maxHeight: 320, overflow: "auto", p: 1 }}>
                  {filteredFormShortcuts.map((item) => {
                    const favorite = isFavorite(item)
                    return (
                      <Box
                        key={item.key}
                        sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, py: 0.5 }}
                      >
                        <Button size="small" onClick={() => navigate(buildShortcutHref(item))} sx={{ justifyContent: "flex-start", flexGrow: 1 }}>
                          {item.label}
                        </Button>
                        <Button
                          size="small"
                          variant={favorite ? "contained" : "outlined"}
                          startIcon={favorite ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                          onClick={() => toggleFavorite(item)}
                        >
                          {favorite ? "Favorited" : "Favorite"}
                        </Button>
                      </Box>
                    )
                  })}
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                  <StarIcon fontSize="small" />
                  Favorites ({accessibleFavorites.length})
                </Typography>
                {accessibleFavorites.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No favorites saved yet.</Typography>
                ) : (
                  accessibleFavorites.map((item) => (
                    <Box key={item.key} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 0.5 }}>
                      <Button size="small" onClick={() => navigate(buildShortcutHref(item))}>{item.label}</Button>
                      <Button size="small" color="error" onClick={() => toggleFavorite(item)}>Remove</Button>
                    </Box>
                  ))
                )}
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                  <HistoryIcon fontSize="small" />
                  Recents ({accessibleRecents.length})
                </Typography>
                {accessibleRecents.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No recent forms yet.</Typography>
                ) : (
                  accessibleRecents.map((item) => (
                    <Box key={item.key} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 0.5 }}>
                      <Button size="small" onClick={() => navigate(buildShortcutHref(item))}>{item.label}</Button>
                    </Box>
                  ))
                )}
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
      </Box>
    </Box>
  )
}

export default Settings
