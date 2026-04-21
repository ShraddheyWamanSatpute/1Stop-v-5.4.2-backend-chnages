"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Box,
  Tabs,
  Tab,
  Snackbar,
  Alert,
} from "@mui/material"
import {
  Category as CategoryIcon,
  LocalShipping as SupplierIcon,
  LocationOn as LocationIcon,
  Restaurant as RestaurantIcon,
  Straighten as MeasureIcon,
} from "@mui/icons-material"
import type { TabPanelProps } from "../../../backend/context/StockContext"
import { useNavigate, useLocation } from "react-router-dom"
import CategoriesManagement from "./CategoriesManagement"
import SuppliersManagement from "./SuppliersManagement"
import LocationsManagement from "./LocationsManagement"
import MeasuresManagement from "./MeasuresManagement"
import CoursesManagement from "./CoursesManagement"
import { usePermission } from "../../hooks/usePermission"

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`management-tabpanel-${index}`}
      aria-labelledby={`management-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3, width: "100%" }}>{children}</Box>}
    </div>
  )
}

const ManagementGrid: React.FC = () => {
  const [tabValue, setTabValue] = useState(0)
  const navigate = useNavigate()
  const location = useLocation()
  const { canView, canEdit, canDelete } = usePermission()

  const canAccessCategories = canView("stock", "categories") || canEdit("stock", "categories") || canDelete("stock", "categories")
  const canAccessSuppliers = canView("stock", "suppliers") || canEdit("stock", "suppliers") || canDelete("stock", "suppliers")

  const managementTabs = [
    canAccessCategories ? { label: "Categories", slug: "categories", icon: <CategoryIcon />, component: <CategoriesManagement /> } : null,
    canAccessSuppliers ? { label: "Suppliers", slug: "suppliers", icon: <SupplierIcon />, component: <SuppliersManagement /> } : null,
    canAccessCategories ? { label: "Locations", slug: "locations", icon: <LocationIcon />, component: <LocationsManagement /> } : null,
    canAccessCategories ? { label: "Measures", slug: "measures", icon: <MeasureIcon />, component: <MeasuresManagement /> } : null,
    canAccessCategories ? { label: "Courses", slug: "courses", icon: <RestaurantIcon />, component: <CoursesManagement /> } : null,
  ].filter(Boolean) as Array<{ label: string; slug: string; icon: React.ReactNode; component: React.ReactNode }>

  // Notification state
  const [notification, setNotification] = useState<{
    open: boolean
    message: string
    severity: "success" | "error" | "info" | "warning"
  }>({
    open: false,
    message: "",
    severity: "success",
  })

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)

    const selectedTab = managementTabs[newValue]
    if (!selectedTab) {
      return
    }

    const slugToPascalPath = (slug: string) => {
      return slug.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join("")
    }
    const targetPath = `/Stock/Management/${slugToPascalPath(selectedTab.slug)}`
    if (location.pathname !== targetPath) {
      navigate(targetPath)
    }
  }

  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false,
    })
  }

  useEffect(() => {
    const pathWithoutTrailingSlash = location.pathname.replace(/\/+$/, "")
    const pathSegments = pathWithoutTrailingSlash.split("/").filter(Boolean)
    const stockIndex = pathSegments.findIndex((segment) => segment === "Stock")
    const managementIndex = stockIndex !== -1 ? pathSegments.findIndex((segment, idx) => idx > stockIndex && segment === "Management") : -1
    const subTabSegment = managementIndex !== -1 ? pathSegments[managementIndex + 1] : undefined

    const defaultSlug = managementTabs[0]?.slug
    const slugToPascalPath = (slug: string) => {
      return slug.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join("")
    }

    if (!managementTabs.length) {
      return
    }

    if (!subTabSegment) {
      if (defaultSlug) {
        const defaultPath = `/Stock/Management/${slugToPascalPath(defaultSlug)}`
        if (pathWithoutTrailingSlash !== defaultPath) {
          navigate(defaultPath, { replace: true })
        }
      }
      setTabValue(0)
      return
    }

    // Match tab by slug, handling PascalCase paths
    const matchedIndex = managementTabs.findIndex((tab) => {
      const pascalSlug = slugToPascalPath(tab.slug)
      return tab.slug === subTabSegment || pascalSlug === subTabSegment
    })
    if (matchedIndex === -1) {
      if (defaultSlug) {
        const defaultPath = `/Stock/Management/${slugToPascalPath(defaultSlug)}`
        if (pathWithoutTrailingSlash !== defaultPath) {
          navigate(defaultPath, { replace: true })
        }
      }
      setTabValue(0)
      return
    }

    setTabValue(matchedIndex)
  }, [location.pathname, navigate])

  return (
    <Box>
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: "100%" }}>
          {notification.message}
        </Alert>
      </Snackbar>

      {!managementTabs.length ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          You do not currently have permission to access any stock management sections.
        </Alert>
      ) : null}

      {managementTabs.length > 0 ? (
        <>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="management tabs" sx={{ mt: 2 }}>
            {managementTabs.map((tab) => (
              <Tab key={tab.slug} icon={tab.icon} label={tab.label} />
            ))}
          </Tabs>

          {managementTabs.map((tab, index) => (
            <TabPanel key={tab.slug} value={tabValue} index={index}>
              {tab.component}
            </TabPanel>
          ))}
        </>
      ) : null}
    </Box>
  )
}

export default ManagementGrid
