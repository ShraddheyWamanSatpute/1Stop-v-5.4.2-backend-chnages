"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import {
  FormControl,
  MenuItem,
  Select,
  SelectChangeEvent,
  Box,
  Typography,
} from "@mui/material"
import { alpha } from "@mui/material/styles"
import { useSettings } from "../../../backend/context/SettingsContext"
import { useCompany } from "../../../backend/context/CompanyContext"
import { DEFAULT_PERMISSIONS } from "../../../backend/interfaces/Company"
import { themeConfig } from "../../../theme/AppTheme"

// Define Company interface locally since it's not exported from the interface file
interface Company {
  companyID: string
  companyName: string
  userPermission: string
  uid?: string
}

const CompanyDropdown: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([])
  const { state } = useSettings()
  const { state: companyState, setCompanyID, dispatch: companyDispatch, fetchSites } = useCompany()
  const [selectedCompany, setSelectedCompany] = useState<string | null>(companyState.companyID || null)
  const previousUserCompaniesRef = useRef<string>("")

  const normalizeCompanies = (rawCompanies: any[], uid?: string): Company[] => {
    const out: Company[] = []
    const seen = new Set<string>()

    ;(rawCompanies || []).forEach((company: any) => {
      const companyID = String(company?.companyID || company?.companyId || company?.id || "").trim()
      if (!companyID) return
      if (seen.has(companyID)) return
      seen.add(companyID)

      const companyName = String(company?.companyName || company?.name || companyID).trim() || companyID
      out.push({
        companyID,
        companyName,
        userPermission: String(company?.role || company?.userPermission || "user"),
        uid,
      })
    })

    return out
  }

  // Memoize user companies to prevent unnecessary recalculations
  const userCompanies = useMemo(() => {
    if (!state.auth.uid || !state.user?.companies) return []
    
    return normalizeCompanies(state.user.companies as any[], state.auth.uid || undefined)
  }, [state.auth.uid, state.user?.companies])

  // Ensure: if a company is selected, it must exist in the dropdown list.
  // This prevents "empty list" state when selection exists but user companies haven't loaded yet.
  const companiesForUi = useMemo(() => {
    const base = companies.length > 0 ? companies : []
    if (!companyState.companyID) return base

    const alreadyIncluded = base.some((c) => c.companyID === companyState.companyID)
    if (alreadyIncluded) return base

    return [
      ...base,
      {
        companyID: companyState.companyID,
        companyName:
          companyState.companyName ||
          companyState.company?.companyName ||
          companyState.companyID,
        userPermission: "user",
      },
    ] as Company[]
  }, [companies, companyState.companyID, companyState.companyName, companyState.company])

  // Load companies from cache immediately on mount, then update from Firebase
  useEffect(() => {
    // Try to load from localStorage first for instant display
    try {
      const cachedState = localStorage.getItem('settingsState')
      if (cachedState) {
        const parsed = JSON.parse(cachedState)
        if (parsed.user?.companies && Array.isArray(parsed.user.companies)) {
            const cachedCompanies = normalizeCompanies(parsed.user.companies, parsed.auth?.uid)
          if (cachedCompanies.length > 0) {
            setCompanies(cachedCompanies)
          }
        }
      }
    } catch (error) {
      // Silent fail - cache is optional
    }
  }, []) // Only run once on mount

  // Update companies when userCompanies changes (from Firebase) - but only if different
  useEffect(() => {
    // Create a stable string representation for comparison
    const newCompaniesStr = JSON.stringify(userCompanies.map(c => ({ companyID: c.companyID, companyName: c.companyName })))
    
    // Only update if the data actually changed
    if (previousUserCompaniesRef.current !== newCompaniesStr) {
      previousUserCompaniesRef.current = newCompaniesStr
      
      if (userCompanies.length === 0) {
        // Only clear if user is logged in (don't clear if just loading)
        if (state.auth.isLoggedIn) {
          setCompanies([])
        }
      } else {
        setCompanies(userCompanies)
      }
    }
  }, [userCompanies, state.auth.isLoggedIn])

  // Update selected company when company state changes (for session restoration)
  useEffect(() => {
    if (companyState.companyID !== selectedCompany) {
      // Verify that the companyID exists in our companies list before setting it
      if (companyState.companyID) {
        const companyExists = companiesForUi.some((company) => company.companyID === companyState.companyID)
        if (companyExists) {
          setSelectedCompany(companyState.companyID)
        } else if (companiesForUi.length > 0) {
          // Company doesn't exist in list, clear selection
          setSelectedCompany("")
          setCompanyID("")
        }
        // If companies.length === 0, wait for companies to load before validating
      } else {
        setSelectedCompany("")
      }
    }
  }, [companyState.companyID, companiesForUi, selectedCompany, setCompanyID])

  const handleSelectCompany = (event: SelectChangeEvent<unknown>) => {
    const companyID = event.target.value

    const selected = companiesForUi.find((c: Company) => c.companyID === companyID)
    if (selected) {
      // First set the company ID to ensure context updates properly
      if (typeof selected.companyID === "string") {
        try {
          // IMPORTANT: Update localStorage immediately before calling setCompanyID
          // This ensures the correct company is loaded on page refresh
          // setCompanyID will also update localStorage, but doing it here ensures consistency
          localStorage.setItem("selectedCompanyID", selected.companyID)
          localStorage.setItem("selectedCompanyName", selected.companyName || "")
          localStorage.setItem("companyID", selected.companyID)
        } catch (error) {
          console.warn('Failed to update localStorage:', error)
        }
        
        // Use CompanyContext helper so company switching clears site/subsite + cached sites
        // This will also update localStorage and clear old company-specific caches
        setCompanyID(selected.companyID)

        // Then set the company object with all properties
        companyDispatch({
          type: "SET_COMPANY",
          payload: {
            companyID: selected.companyID,
            companyName: selected.companyName,
            companyLogo: "",
            companyAddress: "",
            companyPhone: "",
            companyEmail: "",
            companyWebsite: "",
            companyDescription: "",
            companyIndustry: "",
            companySize: "",
            companyType: "",
            companyStatus: "",
            companyCreated: "",
            companyUpdated: "",
            permissions: DEFAULT_PERMISSIONS,
          },
        })

        // Trigger sites loading for the selected company
        fetchSites()

        // Update local state
        setSelectedCompany(selected.companyID)
      } else {
      }
    } else {
      setSelectedCompany("")
    }
  }

  // Removed error handling since we're not using error state anymore

  return (
    <Box>
      {state.auth.isLoggedIn === false ? (
        // User is not logged in
        <Typography variant="caption" sx={{ color: themeConfig.brandColors.offWhite }}>
          Please log in
        </Typography>
      ) : companiesForUi.length === 0 ? (
        // If no companies are found, show empty state text
        <Typography variant="caption" sx={{ color: themeConfig.brandColors.offWhite }}>
          No company selected
        </Typography>
      ) : (
        <Box sx={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <FormControl fullWidth size="small">
            <Select
              value={
                selectedCompany && companiesForUi.some((c: Company) => c.companyID === selectedCompany) 
                  ? selectedCompany 
                  : ""
              }
              onChange={handleSelectCompany}
              displayEmpty
              renderValue={(selected: unknown) => {
                if (!selected || selected === "") return "No company selected"

                // First try to find in loaded companies
                const selectedCompanyObj = companiesForUi.find((c: Company) => c.companyID === selected)
                if (selectedCompanyObj?.companyName) {
                  return selectedCompanyObj.companyName
                }
                if (selectedCompanyObj?.companyID) {
                  return selectedCompanyObj.companyID
                }

                // Fallback to session-stored company name for immediate display
                if (selected === companyState.companyID && companyState.companyName) {
                  return companyState.companyName
                }

                return String(selected)
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
              {companiesForUi.map((company: Company, index: number) => (
                <MenuItem key={company.companyID || `company-${index}`} value={company.companyID}>
                  {`${company.companyName || company.companyID || "Unknown Company"}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>


        </Box>
      )}
    </Box>
  )
}

export default CompanyDropdown
