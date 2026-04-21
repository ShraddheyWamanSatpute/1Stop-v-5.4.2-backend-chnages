"use client"

import { themeConfig } from "../../../theme/AppTheme";
import React, { useState, useMemo, useEffect, useCallback } from "react"
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Snackbar,
  Alert,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Autocomplete,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
} from "@mui/material"
import {
  Add as AddIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  GroupWork as ParLevelIcon,
  DateRange as DateRangeIcon,
  People as PeopleIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material"
import { useStock } from "../../../backend/context/StockContext"
import DataHeader from "../reusable/DataHeader"
import type { Column, ParLevelRow } from "../../../backend/interfaces/Stock"
import EmptyStateCard from "../reusable/EmptyStateCard"
import { debugWarn, debugLog } from "../../../utils/debugLog"
import { useStockSettings } from "../../hooks/useStockSettings"

// Complete columns array with all available columns
const columns: Column[] = [
  { id: "productName", label: "Product Name", visible: true, sortable: true, filterable: true, minWidth: 200 },
  { id: "category", label: "Category", visible: true, sortable: true, filterable: true, minWidth: 120 },
  { id: "subcategory", label: "Subcategory", visible: true, sortable: true, filterable: true, minWidth: 120 },
  { id: "salesDivision", label: "Sales Division", visible: true, sortable: true, filterable: true, minWidth: 120 },
  { id: "type", label: "Type", visible: true, sortable: true, filterable: true, minWidth: 100 },
  { id: "lowStockValueWithUnit", label: "Low Stock Value", visible: true, sortable: true, filterable: false, minWidth: 130, align: "right" },
  { id: "parLevelWithUnit", label: "Par Level", visible: true, sortable: true, filterable: false, minWidth: 120, align: "right" },
]

const ParLevelsManagement: React.FC = () => {
  const { 
    state, 
    fetchParProfiles,
    saveParLevelProfile,
    deleteParProfile,
  } = useStock()
  const { products, measures, categories, subcategories, salesDivisions, dataVersion, loading } = state
  const { stockDecimalPlaces } = useStockSettings()

  const toId = (v: unknown) => String(v ?? "").trim()

  const measuresById = useMemo(() => {
    const m = new Map<string, any>()
    ;(measures || []).forEach((meas: any) => {
      const id = toId(meas?.id)
      if (id) m.set(id, meas)
    })
    return m
  }, [measures])

  const categoriesById = useMemo(() => {
    const m = new Map<string, any>()
    ;(categories || []).forEach((c: any) => {
      const id = toId(c?.id)
      if (id) m.set(id, c)
      const legacyId = toId((c as any)?.legacyId)
      if (legacyId && !m.has(legacyId)) m.set(legacyId, c)
    })
    return m
  }, [categories])

  const subcategoriesById = useMemo(() => {
    const m = new Map<string, any>()
    ;(subcategories || []).forEach((sc: any) => {
      const id = toId(sc?.id)
      if (id) m.set(id, sc)
      const legacyId = toId((sc as any)?.legacyId)
      if (legacyId && !m.has(legacyId)) m.set(legacyId, sc)
    })
    return m
  }, [subcategories])

  const salesDivisionsById = useMemo(() => {
    const m = new Map<string, any>()
    ;(salesDivisions || []).forEach((sd: any) => {
      const id = toId(sd?.id)
      if (id) m.set(id, sd)
      const legacyId = toId((sd as any)?.legacyId)
      if (legacyId && !m.has(legacyId)) m.set(legacyId, sd)
    })
    return m
  }, [salesDivisions])

  const resolveCategoryName = useCallback((product: any): string => {
    const id = toId(product?.categoryId || product?.categoryID)
    const fromList = id ? categoriesById.get(id)?.name : undefined
    return fromList || product?.categoryName || product?.category || "Uncategorized"
  }, [categoriesById])

  const resolveSubcategoryName = useCallback((product: any): string => {
    const id = toId(product?.subcategoryId || product?.subCategoryId || product?.subCategoryID)
    const fromList = id ? subcategoriesById.get(id)?.name : undefined
    return fromList || product?.subcategoryName || product?.subCategory || "Uncategorized"
  }, [subcategoriesById])

  const resolveSalesDivisionName = useCallback((product: any): string => {
    const id = toId(product?.salesDivisionId || product?.salesDivisionID || product?.divisionId)
    const fromList = id ? salesDivisionsById.get(id)?.name : undefined
    return fromList || product?.salesDivisionName || product?.salesDivision || "Uncategorized"
  }, [salesDivisionsById])

  // DataHeader state
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<string>("productName")
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>("asc")
  const [groupBy, setGroupBy] = useState<{ field: string; label: string }>({ field: "none", label: "None" })
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Par level profiles state
  const [profiles, setProfiles] = useState<any[]>([])
  const [selectedProfile, setSelectedProfile] = useState<string>("")
  const [parLevelItems, setParLevelItems] = useState<any[]>([])

  // Inline editing state
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editParLevel, setEditParLevel] = useState<number>(0)
  const [editLowStockValue, setEditLowStockValue] = useState<number>(0)
  const [editMeasureId, setEditMeasureId] = useState<string>("")
  
  // Bulk edit mode state
  const [bulkEditMode, setBulkEditMode] = useState<boolean>(false)
  
  // Profile editing state
  const [editingProfileName, setEditingProfileName] = useState<boolean>(false)
  const [editingProfileDescription, setEditingProfileDescription] = useState<boolean>(false)
  const [tempProfileName, setTempProfileName] = useState<string>("")
  const [tempProfileDescription, setTempProfileDescription] = useState<string>("")
  const [tempParType, setTempParType] = useState<"static" | "per-bookings">("static")
  const [tempPerAmountOfGuests, setTempPerAmountOfGuests] = useState<number>(0)
  const [tempIsDefault, setTempIsDefault] = useState<boolean>(false)

  // Inline editing state
  const [editingProfile, setEditingProfile] = useState<any>(null)
  const [profileData, setProfileData] = useState({
    name: "",
    description: "",
    parType: "static" as "static" | "per-bookings",
    perAmountOfGuests: 0,
    dateRange: {
      start: "",
      end: ""
    }
  })


  // Dialog states
  const [newProfileDialog, setNewProfileDialog] = useState(false)
  const [editProfileDialog, setEditProfileDialog] = useState(false)
  const [deleteProfileDialog, setDeleteProfileDialog] = useState(false)
  const [newProfileName, setNewProfileName] = useState("")
  const [newProfileDescription, setNewProfileDescription] = useState("")
  const [newProfileIsDefault, setNewProfileIsDefault] = useState(false)
  const [editProfileName, setEditProfileName] = useState("")
  const [editProfileDescription, setEditProfileDescription] = useState("")
  const [editProfileIsDefault, setEditProfileIsDefault] = useState(false)

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "warning" | "info"
  })

  const showSnackbar = (message: string, severity: "success" | "error" | "warning" | "info") => {
    setSnackbar({ open: true, message, severity })
  }

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false })
  }

  // Fetch profiles on component mount and when dataVersion changes
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const fetchedProfiles = await fetchParProfiles()
        setProfiles(fetchedProfiles)
        if (fetchedProfiles.length > 0 && !selectedProfile) {
          setSelectedProfile(fetchedProfiles[0].id!)
        }
      } catch (error) {
        debugWarn("Error fetching par profiles:", error)
        showSnackbar("Failed to fetch par level profiles", "error")
      }
    }
    fetchProfiles()
  }, [])

  // DataHeader configuration
  const sortOptions = [
    { value: "productName", label: "Product Name" },
    { value: "category", label: "Category" },
    { value: "subcategory", label: "Subcategory" },
    { value: "salesDivision", label: "Sales Division" },
    { value: "type", label: "Type" },
    { value: "parLevel", label: "Par Level" },
    { value: "lowStockValue", label: "Low Stock Value" },
  ]

  const groupByOptions = [
    { value: "none", label: "None" },
    { value: "category", label: "Category" },
    { value: "subcategory", label: "Subcategory" },
    { value: "salesDivision", label: "Sales Division" },
    { value: "type", label: "Type" },
  ]

  // Filter and sort par level items (updates when dataVersion changes)
  const sortedAndFilteredItems = useMemo(() => {
    const filtered = parLevelItems.filter((item) => {
      const pid = toId(item?.productId)
      const product = products.find((p: any) => toId(p?.id) === pid)
      if (!product) return false
      
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resolveCategoryName(product).toLowerCase().includes(searchTerm.toLowerCase()) ||
        resolveSubcategoryName(product).toLowerCase().includes(searchTerm.toLowerCase()) ||
        resolveSalesDivisionName(product).toLowerCase().includes(searchTerm.toLowerCase())

      return matchesSearch
    })

    // Sort the data
    filtered.sort((a, b) => {
      const productA = products.find((p: any) => toId(p?.id) === toId(a?.productId))
      const productB = products.find((p: any) => toId(p?.id) === toId(b?.productId))
      
      let aValue, bValue
      if (sortBy === "productName") {
        aValue = productA?.name || ""
        bValue = productB?.name || ""
      } else if (sortBy === "category") {
        aValue = productA ? resolveCategoryName(productA) : ""
        bValue = productB ? resolveCategoryName(productB) : ""
      } else if (sortBy === "subcategory") {
        aValue = productA ? resolveSubcategoryName(productA) : ""
        bValue = productB ? resolveSubcategoryName(productB) : ""
      } else if (sortBy === "salesDivision") {
        aValue = productA ? resolveSalesDivisionName(productA) : ""
        bValue = productB ? resolveSalesDivisionName(productB) : ""
      } else if (sortBy === "type") {
        aValue = productA?.type || ""
        bValue = productB?.type || ""
      } else if (sortBy === "parLevel") {
        aValue = a.parLevel || 0
        bValue = b.parLevel || 0
      } else if (sortBy === "lowStockValue") {
        aValue = a.lowStockValue || 0
        bValue = b.lowStockValue || 0
      } else {
        aValue = a[sortBy as keyof typeof a] || ""
        bValue = b[sortBy as keyof typeof b] || ""
      }
      
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      }

      return sortDirection === "asc" ? ((aValue || 0) < (bValue || 0) ? -1 : 1) : (bValue || 0) < (aValue || 0) ? -1 : 1
    })

    return filtered
  }, [parLevelItems, products, dataVersion, searchTerm, sortBy, sortDirection, resolveCategoryName, resolveSubcategoryName, resolveSalesDivisionName])

  // Group data by field
  const groupData = (data: any[]) => {
    if (groupBy.field === "none") return { "All Items": data }

    const grouped: { [key: string]: any[] } = {}

    data.forEach((item) => {
      const product = products.find((p: any) => toId(p?.id) === toId(item?.productId))
      if (!product) return
      
      let groupKey = ""
      switch (groupBy.field) {
        case "type":
          groupKey = product.type || "Unknown"
          break
        case "category":
          groupKey = resolveCategoryName(product) || "Unknown"
          break
        case "subcategory":
          groupKey = resolveSubcategoryName(product) || "Unknown"
          break
        case "salesDivision":
          groupKey = resolveSalesDivisionName(product) || "Unknown"
          break
        default:
          groupKey = "All Items"
      }

      if (!grouped[groupKey]) {
        grouped[groupKey] = []
      }
      grouped[groupKey].push(item)
    })

    return grouped
  }

  // Handle sorting
  const handleSort = (columnId: string) => {
    const column = columnId as keyof ParLevelRow
    const isAsc = sortBy === column && sortDirection === "asc"
    setSortDirection(isAsc ? "desc" : "asc")
    setSortBy(column)
  }

  // Handle group toggle
  const handleGroupToggle = (groupKey: string) => {
    const newExpandedGroups = new Set(expandedGroups)
    if (newExpandedGroups.has(groupKey)) {
      newExpandedGroups.delete(groupKey)
    } else {
      newExpandedGroups.add(groupKey)
    }
    setExpandedGroups(newExpandedGroups)
  }




  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingItem(null)
    setEditParLevel(0)
    setEditLowStockValue(0)
    setEditMeasureId("")
  }

  // Handle toggle bulk edit mode
  const handleToggleBulkEdit = async () => {
    if (bulkEditMode) {
      // Exiting bulk edit mode, save all changes
      await handleSaveAllChanges()
      setEditingItem(null)
      setEditingProfileName(false)
      setEditingProfileDescription(false)
    } else {
      // Entering bulk edit mode, also enable profile editing
      const currentProfile = profiles.find((p) => p.id === selectedProfile)
      if (currentProfile) {
        setTempProfileName(currentProfile.name || "")
        setTempProfileDescription(currentProfile.description || "")
        setTempParType(currentProfile.parType || "static")
        setTempPerAmountOfGuests(currentProfile.perAmountOfGuests || 0)
        setTempIsDefault(Boolean(currentProfile.isDefault))
        setEditingProfileName(true)
        setEditingProfileDescription(true)
      }
    }
    setBulkEditMode(!bulkEditMode)
  }

  // Handle save all changes when exiting bulk edit mode
  const handleSaveAllChanges = async () => {
    if (!selectedProfile) {
      showSnackbar("Please select a par level profile first", "warning")
      return
    }

    try {
      // Update the profile with all the current items
      const profileToUpdate = profiles.find((p) => p.id === selectedProfile)
      if (profileToUpdate) {
        // Convert items back to parLevels object
        const updatedParLevels = { ...profileToUpdate.parLevels }
        
        parLevelItems.forEach(item => {
          updatedParLevels[item.id] = {
            parLevel: item.parLevel,
            lowStockValue: item.lowStockValue,
            measureId: item.measureId,
          }
        })

        const updatedProfile = {
          ...profileToUpdate,
          parLevels: updatedParLevels,
          name: tempProfileName || profileToUpdate.name,
          description: tempProfileDescription || profileToUpdate.description,
          parType: tempParType,
          perAmountOfGuests: tempPerAmountOfGuests,
          isDefault: tempIsDefault,
          updatedAt: new Date().toISOString(),
        }
        await saveParLevelProfile(updatedProfile)
        if (tempIsDefault) {
          await applyDefaultProfile(toId(selectedProfile))
        }
        showSnackbar("All par levels updated successfully", "success")
        
        // Reset temp values
        setTempProfileName("")
        setTempProfileDescription("")
        setTempIsDefault(false)
        setEditingProfileName(false)
        setEditingProfileDescription(false)
      }
    } catch (error) {
      debugWarn("Error saving all par levels:", error)
      showSnackbar("Failed to save par levels", "error")
    }
  }



  // Handle create new profile
  const handleCreateNew = () => {
    setEditingProfile({ id: null, name: "", description: "", parType: "static" })
    setProfileData({
      name: "",
      description: "",
      parType: "static",
      perAmountOfGuests: 0,
      dateRange: { start: "", end: "" }
    })
    setParLevelItems([])
  }

  const handleCloseParEditor = () => {
    setEditingProfile(null)
    setProfileData({
      name: "",
      description: "",
      parType: "static",
      perAmountOfGuests: 0,
      dateRange: { start: "", end: "" },
    })
    setParLevelItems([])
  }

  // Handle save profile
  const handleSaveProfile = async () => {
    try {
      // Convert items list to parLevels map (this is the shape the backend persists)
      const parLevels: Record<string, any> = {}
      ;(parLevelItems || []).forEach((item: any) => {
        const pid = toId(item?.productId)
        if (!pid) return
        const parLevel = Number(item?.parLevel || 0)
        const lowStockValue = Number(item?.lowStockValue || 0)
        const measureId = toId(item?.measureId)
        parLevels[pid] = {
          parLevel,
          lowStockValue,
          ...(measureId ? { measureId } : {}),
        }
      })

      const profileToSave = {
        ...editingProfile,
        ...profileData,
        parLevels,
      }

      await saveParLevelProfile(profileToSave)
      showSnackbar("Profile saved successfully", "success")
      setEditingProfile(null)
      setProfileData({
        name: "",
        description: "",
        parType: "static",
        perAmountOfGuests: 0,
        dateRange: { start: "", end: "" }
      })
      setParLevelItems([])
      
      // Refresh profiles
      const fetchedProfiles = await fetchParProfiles()
      setProfiles(fetchedProfiles)
    } catch (error) {
      debugWarn("Error saving profile:", error)
      showSnackbar("Failed to save profile", "error")
    }
  }


  // Handle add item
  const handleAddItem = () => {
    setParLevelItems([...parLevelItems, {
      id: Date.now().toString(),
      productId: "",
      measureId: "",
      parLevel: 0,
      lowStockValue: 0
    }])
  }

  // Handle update item
  const handleUpdateItem = (index: number, field: string, value: any) => {
    const updatedItems = [...parLevelItems]
    const next = { ...updatedItems[index], [field]: value }

    // When creating a new profile/item, auto-fill the measure like the edit view:
    // saved measureId (if any) > purchase.defaultMeasure > sale.defaultMeasure
    if (field === "productId") {
      const pid = toId(value)
      const product = products.find((p: any) => toId(p?.id) === pid)
      if (product && !toId(next.measureId)) {
        next.measureId = toId(product.purchase?.defaultMeasure) || toId(product.sale?.defaultMeasure) || ""
      }
    }

    updatedItems[index] = next
    setParLevelItems(updatedItems)
  }

  const applyDefaultProfile = useCallback(async (desiredDefaultId: string | null, currentProfiles?: any[]) => {
    // Ensure only one profile has isDefault=true (or none if desiredDefaultId is null)
    const base = currentProfiles || (await fetchParProfiles())
    const updated = base.map((p: any) => {
      const id = toId(p?.id)
      const nextIsDefault = desiredDefaultId ? id === desiredDefaultId : false
      // preserve all other fields, just normalize isDefault
      return { ...p, isDefault: nextIsDefault }
    })

    // Save only changed profiles
    const changed = updated.filter((p: any, idx: number) => {
      const before = base[idx]
      return Boolean(before?.isDefault) !== Boolean(p?.isDefault)
    })

    if (changed.length > 0) {
      for (const p of changed) {
        await saveParLevelProfile(p)
      }
    }

    const refreshed = await fetchParProfiles()
    setProfiles(refreshed)
    return refreshed
  }, [fetchParProfiles, saveParLevelProfile, toId])


  // Handle create new profile (dialog)
  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) {
      showSnackbar("Profile name is required", "warning")
      return
    }

    try {
      const name = newProfileName.trim()
      const description = newProfileDescription.trim()
      const newProfile = {
        name,
        description,
        parType: "static",
        isDefault: newProfileIsDefault,
        parLevels: {},
      }

      await saveParLevelProfile(newProfile)
      showSnackbar("Profile created successfully", "success")
      
      // Reset form
      setNewProfileName("")
      setNewProfileDescription("")
      setNewProfileIsDefault(false)
      setNewProfileDialog(false)
      
      // Refresh profiles
      const fetchedProfiles = await fetchParProfiles()
      setProfiles(fetchedProfiles)

      // If requested as default, enforce single default using the newest matching profile
      if (newProfileIsDefault) {
        const match = [...fetchedProfiles]
          .filter((p: any) => toId(p?.name).toLowerCase() === name.toLowerCase() && toId(p?.description) === description)
          .sort((a: any, b: any) => {
            const at = Date.parse(a?.createdAt || a?.updatedAt || "") || 0
            const bt = Date.parse(b?.createdAt || b?.updatedAt || "") || 0
            return bt - at
          })[0]
        const defaultId = match?.id ? toId(match.id) : null
        if (defaultId) {
          await applyDefaultProfile(defaultId, fetchedProfiles)
        } else {
          // fallback: at least ensure only one default remains (pick latest updated that is currently default)
          const currentDefault = [...fetchedProfiles]
            .filter((p: any) => p?.isDefault)
            .sort((a: any, b: any) => (Date.parse(b?.updatedAt || "") || 0) - (Date.parse(a?.updatedAt || "") || 0))[0]
          if (currentDefault?.id) {
            await applyDefaultProfile(toId(currentDefault.id), fetchedProfiles)
          }
        }
      }
    } catch (error) {
      debugWarn("Error creating profile:", error)
      showSnackbar("Failed to create profile", "error")
    }
  }


  // Handle save profile edit (dialog)
  const handleSaveProfileEdit = async () => {
    if (!editProfileName.trim()) {
      showSnackbar("Profile name is required", "warning")
      return
    }

    try {
      const profileToUpdate = profiles.find(p => p.id === selectedProfile)
      if (!profileToUpdate) {
        showSnackbar("Profile not found", "error")
        return
      }

      const updatedProfile = {
        ...profileToUpdate,
        name: editProfileName.trim(),
        description: editProfileDescription.trim(),
        isDefault: editProfileIsDefault
      }

      await saveParLevelProfile(updatedProfile)
      showSnackbar("Profile updated successfully", "success")
      
      setEditProfileDialog(false)
      
      // Refresh profiles
      const fetchedProfiles = await fetchParProfiles()
      setProfiles(fetchedProfiles)

      // Enforce only one default if this profile was set as default
      if (editProfileIsDefault) {
        await applyDefaultProfile(toId(selectedProfile), fetchedProfiles)
      }
    } catch (error) {
      debugWarn("Error updating profile:", error)
      showSnackbar("Failed to update profile", "error")
    }
  }

  // Handle delete profile
  const handleDeleteProfile = async () => {
    if (!selectedProfile) return

    try {
      await deleteParProfile(selectedProfile)
      showSnackbar("Profile deleted successfully", "success")
      
      // Update local state
      const updatedProfiles = profiles.filter(p => p.id !== selectedProfile)
      setProfiles(updatedProfiles)
      setSelectedProfile(updatedProfiles.length > 0 ? updatedProfiles[0].id! : "")
      
      setDeleteProfileDialog(false)
    } catch (error) {
      debugWarn("Error deleting profile:", error)
      showSnackbar("Failed to delete profile", "error")
    }
  }

  // Transform products to par level rows
  const transformProductsToParLevelRows = async () => {
    if (!products.length || !measures.length) {
      return
    }

    // setLoading(true)
    try {
      const selectedProfileData = profiles.find((p) => p.id === selectedProfile)
      const parLevelRows: ParLevelRow[] = []

      for (const product of products) {
        if (!product.id) continue

        // Get category and subcategory names
        const categoryName =
          (categories || []).find((c: any) => c.id === product.categoryId)?.name ||
          product.categoryName ||
          product.category ||
          "Uncategorized"
        const subcategoryName =
          (subcategories || []).find((sc: any) => sc.id === product.subcategoryId)?.name ||
          product.subcategoryName ||
          product.subCategory ||
          "Uncategorized"
        const salesDivisionName =
          (salesDivisions || []).find((sd: any) => sd.id === product.salesDivisionId)?.name ||
          product.salesDivisionName ||
          product.salesDivision ||
          "Uncategorized"

        // Get measures
        const purchaseMeasureId = product.purchase?.defaultMeasure
        const salesMeasureId = product.sale?.defaultMeasure
        const purchaseMeasure = measures.find((m: any) => m.id === purchaseMeasureId)
        const salesMeasure = measures.find((m: any) => m.id === salesMeasureId)

        // Get par level for this product from the selected profile
        const rawParLevelData = selectedProfileData?.parLevels?.[product.id]
        const parLevelData = typeof rawParLevelData === "number" ? { parLevel: rawParLevelData } : rawParLevelData
        let parLevelValue = 0
        let lowStockValue = 0
        let parLevelMeasureId = ""
        
        if (parLevelData && typeof parLevelData === "object") {
          parLevelValue = parLevelData.parLevel || 0
          lowStockValue = parLevelData.lowStockValue || 0
          parLevelMeasureId = parLevelData.measureId || ""
        }

        // Calculate current stock (simplified)
        const currentStock = product.currentStock || 0
        const predictedStock = product.predictedStock || currentStock

        // Calculate order quantity
        const orderQuantity = Math.max(0, parLevelValue - currentStock)


        // Get the primary measure for display
        const primaryMeasure = purchaseMeasure || salesMeasure
        const primaryMeasureId = purchaseMeasureId || salesMeasureId
        const parLevelMeasure = measures.find((m: any) => m.id === parLevelMeasureId)

        parLevelRows.push({
          productId: product.id,
          productName: product.name || "Unknown Product",
          category: categoryName,
          subcategory: subcategoryName,
          salesDivision: salesDivisionName,
          type: product.type || "Unknown",
          currentStock: currentStock,
          predictedStock: predictedStock.toString(),
          predictedStockValue: predictedStock,
          parLevel: parLevelValue,
          parLevelWithUnit: parLevelValue > 0 ? `${parLevelValue} ${parLevelMeasure?.name || primaryMeasure?.name || "unit"}` : "0",
          orderQuantity: orderQuantity,
          orderQuantityWithUnit: orderQuantity > 0 ? `${orderQuantity.toFixed(stockDecimalPlaces)} ${primaryMeasure?.name || "unit"}` : "0",
          measureId: primaryMeasureId || "",
          measureName: primaryMeasure?.name || "Unknown",
          parLevelMeasureId: parLevelMeasureId || primaryMeasureId || "",
          lowStockValue: lowStockValue,
          lowStockValueWithUnit: lowStockValue > 0 ? `${lowStockValue} ${parLevelMeasure?.name || primaryMeasure?.name || "unit"}` : "0",
          // Additional fields for compatibility
          purchaseBaseQuantity: "0",
          purchaseBaseQuantityValue: 0,
          totalPurchaseQuantity: "0",
          totalPurchaseQuantityValue: 0,
          totalPurchaseCost: 0,
          purchaseSupplier: "",
          purchaseMeasure: purchaseMeasure?.name || "",
          salesBaseQuantity: "0",
          salesBaseQuantityValue: 0,
          totalSoldQuantity: "0",
          totalSoldQuantityValue: 0,
          totalSoldValue: 0,
          salesMeasure: salesMeasure?.name || "",
          profit: 0,
          costPerUnit: 0,
          totalValue: 0,
          defaultMeasure: primaryMeasure?.name || "unit",
        } as ParLevelRow)
      }

      // setRows(parLevelRows)
    } catch (error) {
      debugWarn("Error transforming products to par level rows:", error)
      showSnackbar("Error loading product data", "error")
    } finally {
      // setLoading(false)
    }
  }

  // Load all products as par level items when selected profile changes
  useEffect(() => {
    if (!selectedProfile || !products.length) {
      setParLevelItems([])
      return
    }

    const selectedProfileData = profiles.find((p) => p.id === selectedProfile)
    const profileParLevels = selectedProfileData?.parLevels || {}

    // Convert all products to par level items
    const items = products.map((product: any) => {
      const raw = profileParLevels[product.id]
      const parLevelData = typeof raw === "number" ? { parLevel: raw } : (raw || {})
      return {
        id: product.id,
        productId: product.id,
        parLevel: parLevelData.parLevel || 0,
        lowStockValue: parLevelData.lowStockValue || 0,
        measureId:
          parLevelData.measureId ||
          toId(product.purchase?.defaultMeasure) ||
          toId(product.sale?.defaultMeasure) ||
          "",
      }
    })

    setParLevelItems(items)
  }, [selectedProfile, profiles, products, dataVersion])

  // Handle export
  const handleExport = (format: 'csv' | 'pdf') => {
    debugLog(`Exporting par levels as ${format}`)
    showSnackbar(`Export as ${format.toUpperCase()} not implemented yet`, "info")
  }

  // Handle sort change
  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortBy(field)
    setSortDirection(direction)
  }

  // Handle group by change
  const handleGroupByChange = (groupByValue: string) => {
    const groupByOption = groupByOptions.find(option => option.value === groupByValue)
    if (groupByOption) {
      setGroupBy({ field: groupByValue, label: groupByOption.label })
    }
  }

  // Additional controls for DataHeader
  const additionalControls = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 400 }}>
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel sx={{ color: "white" }}>Par Level Profile</InputLabel>
        <Select
          value={selectedProfile}
          onChange={(e) => setSelectedProfile(e.target.value)}
          label="Par Level Profile"
          sx={{
            color: "white",
            "& .MuiSvgIcon-root": { color: "white" },
            "& .MuiOutlinedInput-notchedOutline": { borderColor: "white" },
            "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#e0e0e0" },
          }}
        >
          {profiles.map((profile) => (
            <MenuItem key={profile.id} value={profile.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>{profile.name}</span>
                {profile.isDefault && (
                  <Chip 
                    label="Default" 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                    sx={{ height: 16, fontSize: '0.65rem' }}
                  />
                )}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 150, fontSize: '0.75rem' }}>
        {profiles.find(p => p.id === selectedProfile)?.description || ''}
      </Typography>
      </Box>
    )

  // No loading indicators — UI renders and fills as data arrives (like HR section)
  
  return (
    <Box sx={{ position: 'relative' }}>
      <DataHeader
        showDateControls={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search items..."
        additionalControls={additionalControls}
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        groupByOptions={groupByOptions}
        groupByValue={groupBy.field}
        onGroupByChange={handleGroupByChange}
        onExportCSV={() => handleExport('csv')}
        onExportPDF={() => handleExport('pdf')}
        additionalButtons={[
          {
            label: "Create Par Level",
            icon: <AddIcon />,
            onClick: handleCreateNew,
            variant: "contained" as const,
            color: "primary" as const
          }
        ]}
      />

      {/* Profile Info */}
      {selectedProfile && (
        <Box sx={{ mb: 2, p: 3, bgcolor: "background.paper", borderRadius: 2, border: 1, borderColor: "divider" }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Box sx={{ flex: 1 }}>
              {/* Profile Name and Par Type Row */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 1, flexWrap: 'wrap' }}>
                {/* Profile Name */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {editingProfileName || bulkEditMode ? (
                    <TextField
                      value={tempProfileName}
                      onChange={(e) => setTempProfileName(e.target.value)}
                      size="small"
                      variant="outlined"
                      placeholder="Profile Name"
                      sx={{ minWidth: 250 }}
                    />
                  ) : (
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      {profiles.find((p) => p.id === selectedProfile)?.name || "Unknown Profile"}
                    </Typography>
                  )}
                  {profiles.find((p) => p.id === selectedProfile)?.isDefault && (
                    <Chip 
                      label="Default" 
                      size="small" 
                      color="primary" 
                      variant="filled"
                      sx={{ height: 24, fontSize: '0.75rem', fontWeight: 500 }}
                    />
                  )}
                </Box>

                {/* Par Type Field */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80, fontWeight: 500 }}>
                    Par Type:
                  </Typography>
                  {bulkEditMode ? (
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <Select
                        value={tempParType}
                        onChange={(e) => setTempParType(e.target.value as "static" | "per-bookings")}
                      >
                        <MenuItem value="static">Static</MenuItem>
                        <MenuItem value="per-bookings">Per Bookings</MenuItem>
                      </Select>
                    </FormControl>
                  ) : (
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {profiles.find((p) => p.id === selectedProfile)?.parType || "Static"}
                    </Typography>
                  )}
                </Box>

                {/* Per Amount of Guests Field - Only show if par type is per-bookings */}
                {tempParType === "per-bookings" && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80, fontWeight: 500 }}>
                      Per Guests:
                    </Typography>
                    {bulkEditMode ? (
                      <TextField
                        type="number"
                        value={tempPerAmountOfGuests}
                        onChange={(e) => setTempPerAmountOfGuests(Number(e.target.value))}
                        size="small"
                        variant="outlined"
                        sx={{ width: 120 }}
                        inputProps={{ min: 0 }}
                      />
                    ) : (
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {profiles.find((p) => p.id === selectedProfile)?.perAmountOfGuests || 0} guests
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
              
              {/* Profile Description */}
              {editingProfileDescription || bulkEditMode ? (
                <TextField
                  value={tempProfileDescription}
                  onChange={(e) => setTempProfileDescription(e.target.value)}
                  size="small"
                  variant="outlined"
                  multiline
                  rows={2}
                  placeholder="Profile Description"
                  sx={{ minWidth: 600, maxWidth: 800, width: '100%' }}
                />
              ) : (
                <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                  {profiles.find((p) => p.id === selectedProfile)?.description || "No description"}
                </Typography>
              )}

            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={bulkEditMode ? <SaveIcon /> : <EditIcon />}
                onClick={handleToggleBulkEdit}
                color={bulkEditMode ? "success" : "primary"}
              >
                {bulkEditMode ? "Save" : "Edit"}
              </Button>
            </Box>
          </Box>
          {bulkEditMode && (
            <Box sx={{ mt: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={tempIsDefault}
                    onChange={(e) => setTempIsDefault(e.target.checked)}
                  />
                }
                label="Set as default profile"
              />
            </Box>
          )}
        </Box>
      )}

      {/* Create/Edit Par Level Profile Modal */}
      <Dialog
        open={Boolean(editingProfile)}
        onClose={handleCloseParEditor}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingProfile?.id ? "Edit Par Level Profile" : "Create New Par Level Profile"}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mb: 2, mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Profile Name"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Description"
                value={profileData.description}
                onChange={(e) => setProfileData({ ...profileData, description: e.target.value })}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Par Type</InputLabel>
                <Select
                  value={profileData.parType}
                  label="Par Type"
                  onChange={(e) => setProfileData({ ...profileData, parType: e.target.value as "static" | "per-bookings" })}
                >
                  <MenuItem value="static">Static</MenuItem>
                  <MenuItem value="per-bookings">Per Bookings</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {profileData.parType === "per-bookings" && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Per Amount of Guests"
                    type="number"
                    value={profileData.perAmountOfGuests}
                    onChange={(e) => setProfileData({ ...profileData, perAmountOfGuests: Number(e.target.value) })}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PeopleIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Start Date"
                    type="date"
                    value={profileData.dateRange.start}
                    onChange={(e) => setProfileData({
                      ...profileData,
                      dateRange: { ...profileData.dateRange, start: e.target.value }
                    })}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <DateRangeIcon />
                        </InputAdornment>
                      ),
                    }}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="End Date"
                    type="date"
                    value={profileData.dateRange.end}
                    onChange={(e) => setProfileData({
                      ...profileData,
                      dateRange: { ...profileData.dateRange, end: e.target.value }
                    })}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <DateRangeIcon />
                        </InputAdornment>
                      ),
                    }}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </>
            )}
          </Grid>

          <Typography variant="h6" gutterBottom>
            Par Level Items
          </Typography>

          <TableContainer component={Paper} sx={{ mb: 2, opacity: loading ? 0.7 : 1, transition: 'opacity 0.3s' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell>Measure</TableCell>
                  <TableCell>Par Level</TableCell>
                  <TableCell>Low Stock Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {parLevelItems.map((item, index) => (
                  <TableRow key={item.id || index}>
                    <TableCell>
                      <Autocomplete
                        options={products || []}
                        getOptionLabel={(option) => option.name || ""}
                        value={products?.find(p => p.id === item.productId) || null}
                        onChange={(_, newValue) => handleUpdateItem(index, "productId", newValue?.id || "")}
                        renderInput={(params) => (
                          <TextField {...params} variant="outlined" size="small" />
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <Autocomplete
                        options={measures || []}
                        getOptionLabel={(option) => option.name || ""}
                        value={measures?.find(m => m.id === item.measureId) || null}
                        onChange={(_, newValue) => handleUpdateItem(index, "measureId", newValue?.id || "")}
                        renderInput={(params) => (
                          <TextField {...params} variant="outlined" size="small" />
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        value={item.parLevel ? item.parLevel : ""}
                        onChange={(e) => handleUpdateItem(index, "parLevel", Number(e.target.value))}
                        variant="outlined"
                        size="small"
                        inputProps={{ min: 0, step: 0.01 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        value={item.lowStockValue ? item.lowStockValue : ""}
                        onChange={(e) => handleUpdateItem(index, "lowStockValue", Number(e.target.value))}
                        variant="outlined"
                        size="small"
                        inputProps={{ min: 0, step: 0.01 }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddItem}
            >
              Add Item
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            startIcon={<CancelIcon />}
            onClick={handleCloseParEditor}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={async () => {
              await handleSaveProfile()
              handleCloseParEditor()
            }}
          >
            {editingProfile?.id ? "Update Profile" : "Save Profile"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Comprehensive Par Levels Table */}
      <TableContainer component={Paper} elevation={0} sx={{ border: 1, borderColor: "divider", opacity: loading ? 0.7 : 1, transition: 'opacity 0.3s' }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead sx={{ bgcolor: "action.hover" }}>
            <TableRow>
              {columns.map((column) => (
                  <TableCell 
                    key={column.id} 
                    align="center"
                sx={{ 
                      textAlign: 'center !important',
                      padding: '16px 16px',
                      cursor: column.sortable ? 'pointer' : 'default',
                      userSelect: 'none',
                      fontWeight: 'bold',
                      '&:hover': {
                        backgroundColor: column.sortable ? 'rgba(0, 0, 0, 0.04)' : 'transparent'
                      }
                    }}
                    onClick={column.sortable ? () => handleSort(column.id) : undefined}
                  >
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      gap: 0.5
                    }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        {column.label}
                      </Typography>
                      {column.sortable && sortBy === column.id && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </Box>
                      )}
                    </Box>
                </TableCell>
                ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(groupData(sortedAndFilteredItems)).map(([groupKey, groupItems]) => (
              <React.Fragment key={groupKey}>
                {groupBy.field !== "none" && (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      sx={{ bgcolor: "action.selected", fontWeight: "bold" }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", cursor: "pointer" }}
                        onClick={() => handleGroupToggle(groupKey)}
                      >
                        {expandedGroups.has(groupKey) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        <ParLevelIcon sx={{ ml: 1, mr: 1 }} />
                        {groupKey} ({groupItems.length} items)
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
                {groupItems.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      align="center"
                      sx={{ py: 3 }}
                    >
                      <Typography variant="body1" color="text.secondary">
                        {!selectedProfile
                          ? "Please select a par level profile to view data"
                          : "No products found matching your search"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  groupItems.map((item, index) => {
                    const product = products.find((p: any) => toId(p?.id) === toId(item?.productId))
                    if (!product) return null
                    
                    return (
                      <TableRow
                        key={`${item.id}-${index}`}
                        sx={{
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                      >
                        {columns.map((column) => {
                            let value
                            if (column.id === "productName") {
                              value = product.name
                            } else if (column.id === "category") {
                              value = resolveCategoryName(product) || "Unknown"
                            } else if (column.id === "subcategory") {
                              value = resolveSubcategoryName(product) || "Unknown"
                            } else if (column.id === "salesDivision") {
                              value = resolveSalesDivisionName(product) || "Unknown"
                            } else if (column.id === "type") {
                              value = product.type
                            } else if (column.id === "parLevelWithUnit") {
                              const measure = measures.find((m: any) => m.id === item.measureId)
                              value = item.parLevel > 0 ? `${item.parLevel} ${measure?.name || "unit"}` : "0"
                            } else if (column.id === "lowStockValueWithUnit") {
                              const measure = measures.find((m: any) => m.id === item.measureId)
                              value = item.lowStockValue > 0 ? `${item.lowStockValue} ${measure?.name || "unit"}` : "0"
                            } else {
                              value = item[column.id as keyof typeof item] || ""
                            }
                            
                            return (
                              <TableCell key={column.id} align="center" sx={{ verticalAlign: 'middle' }}>
                                {column.id === "parLevelWithUnit" && (editingItem === item.id || bulkEditMode) ? (
                                  <Box sx={{ display: "flex", gap: 1, alignItems: "center", justifyContent: "center" }}>
                                    <TextField
                                      type="number"
                                      value={bulkEditMode ? (item.parLevel ? item.parLevel : "") : (editParLevel ? editParLevel : "")}
                                      onChange={(e) => {
                                        if (bulkEditMode) {
                                          // Update the item directly in bulk edit mode
                                          const updatedItems = parLevelItems.map(parItem => 
                                            parItem.id === item.id 
                                              ? { ...parItem, parLevel: Number(e.target.value) }
                                              : parItem
                                          )
                                          setParLevelItems(updatedItems)
                                        } else {
                                          setEditParLevel(Number(e.target.value))
                                        }
                                      }}
                      size="small" 
                                      sx={{ width: 80 }}
                                      inputProps={{ min: 0, step: 0.01 }}
                                    />
                                    <FormControl size="small" sx={{ minWidth: 100 }}>
                                      <Select
                                        value={bulkEditMode ? (item.measureId || "") : editMeasureId}
                                        onChange={(e) => {
                                          if (bulkEditMode) {
                                            const updatedItems = parLevelItems.map((parItem) =>
                                              parItem.id === item.id ? { ...parItem, measureId: e.target.value } : parItem,
                                            )
                                            setParLevelItems(updatedItems)
                                          } else {
                                            setEditMeasureId(e.target.value)
                                          }
                                        }}
                                      >
                                        {measures.map((measure: any) => (
                                          <MenuItem key={measure.id} value={measure.id}>
                                            {measure.name}
                                          </MenuItem>
                                        ))}
                                      </Select>
                                    </FormControl>
                                  </Box>
                                ) : column.id === "lowStockValueWithUnit" && (editingItem === item.id || bulkEditMode) ? (
                                  <Box sx={{ display: "flex", gap: 1, alignItems: "center", justifyContent: "center" }}>
                                    <TextField
                                      type="number"
                                      value={bulkEditMode ? (item.lowStockValue ? item.lowStockValue : "") : (editLowStockValue ? editLowStockValue : "")}
                                      onChange={(e) => {
                                        if (bulkEditMode) {
                                          // Update the item directly in bulk edit mode
                                          const updatedItems = parLevelItems.map(parItem => 
                                            parItem.id === item.id 
                                              ? { ...parItem, lowStockValue: Number(e.target.value) }
                                              : parItem
                                          )
                                          setParLevelItems(updatedItems)
                                        } else {
                                          setEditLowStockValue(Number(e.target.value))
                                        }
                                      }}
                                      size="small"
                                      sx={{ width: 80 }}
                                      inputProps={{ min: 0, step: 0.01 }}
                                    />
                                    <FormControl size="small" sx={{ minWidth: 100 }}>
                                      <Select
                                        value={bulkEditMode ? (item.measureId || "") : editMeasureId}
                                        onChange={(e) => {
                                          if (bulkEditMode) {
                                            const updatedItems = parLevelItems.map((parItem) =>
                                              parItem.id === item.id ? { ...parItem, measureId: e.target.value } : parItem,
                                            )
                                            setParLevelItems(updatedItems)
                                          } else {
                                            setEditMeasureId(e.target.value)
                                          }
                                        }}
                                      >
                                        {measures.map((measure: any) => (
                                          <MenuItem key={measure.id} value={measure.id}>
                                            {measure.name}
                                          </MenuItem>
                                        ))}
                                      </Select>
                                    </FormControl>
                  </Box>
                                ) : column.id === "parLevelWithUnit" && editingItem !== item.id ? (
                                  <Typography>{value}</Typography>
                                ) : column.id === "lowStockValueWithUnit" && editingItem !== item.id ? (
                                  <Typography>{value}</Typography>
                                ) : column.format ? (
                                  column.format(value)
                                ) : (
                                  value
                                )}
                </TableCell>
                            )
                          })}
              </TableRow>
                    )
                  })
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Summary */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Showing {sortedAndFilteredItems.length} of {parLevelItems.length} items
          </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Total Items: {parLevelItems.length}
          </Typography>
        </Box>
      </Box>

      {/* New Profile Dialog */}
      <Dialog open={newProfileDialog} onClose={() => setNewProfileDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Par Level Profile</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Profile Name"
            fullWidth
            variant="outlined"
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description (Optional)"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newProfileDescription}
            onChange={(e) => setNewProfileDescription(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={newProfileIsDefault}
                onChange={(e) => setNewProfileIsDefault(e.target.checked)}
                color="primary"
              />
            }
            label="Make this the default profile"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewProfileDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateProfile} variant="contained">
            Create Profile
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={editProfileDialog} onClose={() => setEditProfileDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Par Level Profile</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Profile Name"
            fullWidth
            variant="outlined"
            value={editProfileName}
            onChange={(e) => setEditProfileName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description (Optional)"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={editProfileDescription}
            onChange={(e) => setEditProfileDescription(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={editProfileIsDefault}
                onChange={(e) => setEditProfileIsDefault(e.target.checked)}
                color="primary"
              />
            }
            label="Make this the default profile"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditProfileDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveProfileEdit} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Profile Dialog */}
      <Dialog open={deleteProfileDialog} onClose={() => setDeleteProfileDialog(false)}>
        <DialogTitle>Delete Par Level Profile</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the profile "{profiles.find((p) => p.id === selectedProfile)?.name}"? This
            action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteProfileDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteProfile} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default ParLevelsManagement
