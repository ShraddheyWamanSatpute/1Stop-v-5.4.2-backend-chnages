"use client"

import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  FormControl,
  Box,
  Select,
  MenuItem,
  Typography,
  SelectChangeEvent,
} from "@mui/material"
import { alpha } from "@mui/material/styles"
import { useCompany } from "../../../backend/context/CompanyContext"
import type { Site } from "../../../backend/interfaces/Company"
import { themeConfig } from "../../../theme/AppTheme"


const SiteDropdown: React.FC = () => {
  const [sites, setSites] = useState<Site[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { 
    state: companyState, 
    selectSite, 
    getUserAccessibleSites
  } = useCompany()
  const [selectedSite, setSelectedSite] = useState<string>(companyState.selectedSiteID || "")
  const navigate = useNavigate()
  
  // Track if we've loaded sites for the current company
  const [hasLoggedSites, setHasLoggedSites] = useState(false)
  const [lastCompanyID, setLastCompanyID] = useState<string | null>(null)

  // Update selected site when company state changes (for session restoration)
  useEffect(() => {
    setSelectedSite(companyState.selectedSiteID || "")
  }, [companyState.selectedSiteID])

  // Reset when company changes
  useEffect(() => {
    if (!companyState.companyID) {
      setSelectedSite("")
      setSites([])
      setError(null)
      setHasLoggedSites(false) // Reset flag when company changes
      setLastCompanyID(null)
      return
    }
    
    // Keep current selection during company initialization
    setError(null)
    
    // Reset loading flag when company changes
    if (companyState.companyID !== lastCompanyID) {
      setHasLoggedSites(false)
      setLastCompanyID(companyState.companyID)
    }
  }, [companyState.companyID, lastCompanyID])

  // OPTIMIZED: Load sites INSTANTLY from CompanyContext, then filter in background
  useEffect(() => {
    if (!companyState.companyID) return
    
    // STEP 1: Use CompanyContext sites IMMEDIATELY (instant, no Firebase call)
    if (companyState.sites && companyState.sites.length > 0 && sites.length === 0) {
      setSites(companyState.sites)
      setHasLoggedSites(true)
      setError(null)
      setIsLoading(false)
    }
    
    // STEP 2: Filter by permissions in background (non-blocking)
    if (companyState.sites && companyState.sites.length > 0 && !hasLoggedSites) {
      setHasLoggedSites(true) // Mark as loaded so we don't block
      
      // Filter in background - don't block UI
      Promise.resolve().then(async () => {
        try {
          const accessibleSites = await getUserAccessibleSites()
          if (accessibleSites && accessibleSites.length > 0) {
            // Only update if different (to prevent unnecessary re-renders)
            const currentSiteIds = new Set(sites.map(s => s.siteID))
            const accessibleSiteIds = new Set(accessibleSites.map(s => s.siteID))
            const isDifferent = currentSiteIds.size !== accessibleSiteIds.size || 
              [...currentSiteIds].some(id => !accessibleSiteIds.has(id))
            
            if (isDifferent) {
              setSites(accessibleSites)
            }
          }
        } catch (err) {
          // Keep using CompanyContext sites - don't clear on error
        }
      })
    }
  }, [companyState.companyID, companyState.sites?.length, sites.length, hasLoggedSites, getUserAccessibleSites])

  // Sync with company state site selection and validate site ID
  // IMPORTANT: Only validate after sites are fully loaded to prevent premature clearing
  useEffect(() => {
    // Don't validate while still loading - don't set selectedSite until sites are loaded
    // This prevents MUI warnings about out-of-range values
    if (isLoading || !hasLoggedSites || sites.length === 0) {
      // Clear selectedSite during loading to prevent MUI warnings
      // The Select component will show empty, but renderValue will show the site name from state
      setSelectedSite("")
      return
    }
    
    // Now validate the selection after sites are loaded
    if (companyState.selectedSiteID) {
      const isValidSite = sites.some(site => site.siteID === companyState.selectedSiteID)
      if (isValidSite) {
        setSelectedSite(companyState.selectedSiteID)
      } else {
        // Site doesn't exist in accessible sites - check if it exists in all sites
        // This handles the case where user might have lost access
        if (companyState.sites && companyState.sites.length > 0) {
          const existsInAllSites = companyState.sites.some(s => s.siteID === companyState.selectedSiteID)
          if (!existsInAllSites) {
            // Site truly doesn't exist, clear it
            selectSite("", "")
            setSelectedSite("")
            try {
              localStorage.removeItem("selectedSiteID")
              localStorage.removeItem("selectedSiteName")
              // Also clear subsite if site is invalid
              localStorage.removeItem("selectedSubsiteID")
              localStorage.removeItem("selectedSubsiteName")
            } catch {}
          } else {
            // Still set it so it shows in the dropdown
            setSelectedSite(companyState.selectedSiteID)
          }
        } else {
          // Can't verify, clear selection to be safe
          setSelectedSite("")
        }
      }
    } else {
      setSelectedSite("")
    }
  }, [companyState.selectedSiteID, companyState.sites, sites, selectSite, isLoading, hasLoggedSites])

  const handleSelectSite = (event: SelectChangeEvent<unknown>) => {
    const siteID = event.target.value as string

    // Handle None selection (empty string)
    if (siteID === "") {
      selectSite("", "") // Clear site selection in context
      setSelectedSite("") // Set to empty string instead of null
      return
    }

    const selected = sites.find((s) => s.siteID === siteID)
    if (selected) {
      selectSite(selected.siteID, selected.name || "Unknown Site")
      setSelectedSite(selected.siteID)
    }
  }

  // Don't render if no company is selected
  if (!companyState.companyID) {
    return null
  }

  return (
    <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
      {error ? (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      ) : (
        <>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <FormControl size="small" sx={{ minWidth: "200px" }}>
              <Select
                value={
                  // CRITICAL: Only set value if the site exists in the sites array
                  // This prevents MUI warnings about out-of-range values
                  // If sites haven't loaded yet, use empty string
                  (selectedSite && sites.length > 0 && sites.some(s => s.siteID === selectedSite)) 
                    ? selectedSite 
                    : ""
                }
                onChange={handleSelectSite}
                displayEmpty
                renderValue={(selected: unknown) => {
                  if (!selected || selected === "") return "Select a Site"
                  
                  // First try to find in loaded sites
                  const selectedSiteObj = sites.find((s) => s.siteID === selected)
                  if (selectedSiteObj?.name) {
                    return selectedSiteObj.name
                  }
                  
                  // Fallback to session-stored site name for immediate display (important during loading)
                  if (selected === companyState.selectedSiteID && companyState.selectedSiteName) {
                    return companyState.selectedSiteName
                  }
                  
                  return "Select a Site"
                }}
                sx={(theme) => ({
                  color: themeConfig.brandColors.offWhite,
                  ".MuiSelect-icon": { color: themeConfig.brandColors.offWhite },
                  ".MuiOutlinedInput-notchedOutline": {
                    borderColor: alpha(themeConfig.brandColors.offWhite, 0.3),
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: alpha(themeConfig.brandColors.offWhite, 0.5),
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: themeConfig.brandColors.offWhite,
                  },
                })}
              >
                <MenuItem key="none" value="">
                  <em>None</em>
                </MenuItem>
                {sites.length > 0 ? (
                  sites.map((site, index) => {
                    if (!site || !site.siteID) {
                      return null
                    }
                    return (
                      <MenuItem key={site.siteID || `site-${index}`} value={site.siteID}>
                        {site.name || "Unknown Site"}
                      </MenuItem>
                    )
                  }).filter(Boolean) // Remove null entries
                ) : (
                  !isLoading && (
                    <MenuItem disabled value="">
                      {error || "No sites available"}
                    </MenuItem>
                  )
                )}
              </Select>
            </FormControl>
          </Box>

          {/* SubsiteDropdown is now handled by LocationSelector */}
        </>
      )}
    </Box>
  )
}

export default SiteDropdown
